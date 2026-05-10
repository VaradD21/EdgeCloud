import Docker from 'dockerode';
import si from 'systeminformation';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

const docker = new Docker();
const CONFIG_FILE = path.join(app.getPath('userData'), '.edgecloud_node');
const BACKEND_URL = process.env.EDGECLOUD_URL || 'http://localhost:8000';

class AgentEngine {
    constructor() {
        this.config = null;
        this.isRunning = false;
        this.deployments = [];
        this.intervalId = null;
    }

    async loadConfig() {
        if (fs.existsSync(CONFIG_FILE)) {
            this.config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            return this.config;
        }
        return null;
    }

    async saveConfig(config) {
        this.config = config;
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    }

    async registerNode(email, password, name) {
        try {
            // 1. Login
            const loginResp = await axios.post(`${BACKEND_URL}/auth/login`, {
                email,
                password
            });
            const hostToken = loginResp.data.access_token;

            // 2. Get Specs
            const cpu = await si.cpu();
            const mem = await si.mem();
            const disk = await si.fsSize();

            const nodeData = {
                name: name || 'electron-node',
                cpu_total: cpu.cores,
                ram_total: Math.round(mem.total / (1024 * 1024 * 1024)),
                storage_total_gb: Math.round(disk[0].size / (1024 * 1024 * 1024))
            };

            // 3. Register
            const regResp = await axios.post(`${BACKEND_URL}/nodes/register`, nodeData, {
                headers: { Authorization: `Bearer ${hostToken}` }
            });

            const config = {
                node_id: regResp.data.id,
                node_secret: regResp.data.node_secret,
                name: nodeData.name
            };

            await this.saveConfig(config);
            return config;
        } catch (error) {
            console.error('Registration failed:', error.response?.data || error.message);
            throw error;
        }
    }

    async start() {
        if (this.isRunning) return;
        const config = await this.loadConfig();
        if (!config) throw new Error('No config found. Please register first.');

        this.isRunning = true;
        this.poll();
        this.intervalId = setInterval(() => this.poll(), 10000);
    }

    stop() {
        this.isRunning = false;
        if (this.intervalId) clearInterval(this.intervalId);
    }

    async poll() {
        if (!this.isRunning) return;
        try {
            const { node_secret } = this.config;
            const resp = await axios.get(`${BACKEND_URL}/agent/deployments`, {
                headers: { Authorization: `Bearer ${node_secret}` }
            });

            const targetDeployments = resp.data;
            this.deployments = targetDeployments;

            // Reconcile Docker
            await this.reconcile(targetDeployments);
        } catch (error) {
            console.error('Polling error:', error.message);
        }
    }

    async reconcile(targetDeployments) {
        const existingContainers = await docker.listContainers({ all: true });
        const edgeContainers = existingContainers.filter(c => c.Names[0].startsWith('/edgecloud_'));

        for (const dep of targetDeployments) {
            const containerName = `edgecloud_${dep.deployment_id}`;
            const container = edgeContainers.find(c => c.Names[0] === `/${containerName}`);
            const isRunning = container && container.State === 'running';

            if (dep.status === 'running' && !isRunning) {
                await this.startContainer(dep, container);
            } else if (dep.status !== 'running' && container) {
                await this.stopContainer(dep.deployment_id, container);
            }

            if (isRunning) {
                await this.reportMetrics(dep.deployment_id, container);
            }
        }
    }

    async startContainer(dep, existingContainer) {
        try {
            if (existingContainer) {
                const c = docker.getContainer(existingContainer.Id);
                await c.remove({ force: true });
            }

            console.log(`[PULLING] ${dep.docker_image}...`);
            await docker.pull(dep.docker_image);

            const containerPort = dep.container_port || 80;
            let env = [];
            if (dep.env_vars) {
                try {
                    const envObj = JSON.parse(dep.env_vars);
                    env = Object.entries(envObj).map(([k, v]) => `${k}=${v}`);
                } catch (e) {}
            }

            const c = await docker.createContainer({
                Image: dep.docker_image,
                name: `edgecloud_${dep.deployment_id}`,
                Env: env,
                HostConfig: {
                    PortBindings: { [`${containerPort}/tcp`]: [{ HostPort: String(containerPort) }] },
                    Memory: dep.ram_limit ? dep.ram_limit * 1024 * 1024 * 1024 : 512 * 1024 * 1024,
                    CpuQuota: dep.cpu_limit ? dep.cpu_limit * 100000 : 100000,
                    CpuPeriod: 100000
                }
            });

            await c.start();
            console.log(`[STARTED] ${dep.deployment_id}`);
            await this.pushLog(dep.deployment_id, ['Container started via Electron Agent']);
        } catch (error) {
            console.error(`Failed to start ${dep.deployment_id}:`, error.message);
        }
    }

    async stopContainer(deployment_id, containerInfo) {
        try {
            const c = docker.getContainer(containerInfo.Id);
            await c.stop();
            await c.remove();
            console.log(`[STOPPED] ${deployment_id}`);
            await this.pushLog(deployment_id, ['Container stopped via Electron Agent']);
        } catch (error) {
            console.error(`Failed to stop ${deployment_id}:`, error.message);
        }
    }

    async reportMetrics(deployment_id, containerInfo) {
        try {
            const c = docker.getContainer(containerInfo.Id);
            const stats = await c.stats({ stream: false });
            
            // Calculate CPU
            const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
            const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
            const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100 : 0;

            const memUsage = stats.memory_stats.usage / (1024 * 1024);
            const memLimit = stats.memory_stats.limit / (1024 * 1024);

            await axios.post(`${BACKEND_URL}/agent/push-metrics`, {
                metrics: [{
                    deployment_id,
                    cpu_percent: Math.max(1.2, cpuPercent),
                    memory_mb: Math.max(15.5, memUsage),
                    memory_limit_mb: memLimit,
                    uptime_seconds: 0
                }]
            }, {
                headers: { Authorization: `Bearer ${this.config.node_secret}` }
            });

            // Logs
            const logs = await c.logs({ stdout: true, stderr: true, tail: 50 });
            const lines = logs.toString('utf8').split('\n').filter(l => l.trim());
            await this.pushLog(deployment_id, lines);

        } catch (error) {
            // Ignore metrics errors
        }
    }

    async pushLog(deployment_id, lines) {
        try {
            await axios.post(`${BACKEND_URL}/agent/push-logs`, {
                deployment_id,
                lines
            }, {
                headers: { Authorization: `Bearer ${this.config.node_secret}` }
            });
        } catch (e) {}
    }

    async getStatus() {
        const config = await this.loadConfig();
        const stats = await si.currentLoad();
        const mem = await si.mem();
        
        return {
            isRegistered: !!config,
            nodeName: config?.name || 'Unregistered',
            nodeId: config?.node_id,
            isRunning: this.isRunning,
            system: {
                cpuLoad: stats.currentLoad,
                memUsed: mem.active / (1024 * 1024 * 1024),
                memTotal: mem.total / (1024 * 1024 * 1024)
            },
            deployments: this.deployments
        };
    }
}

export default new AgentEngine();
