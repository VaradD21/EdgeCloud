# Deployment Flow

Step-by-step walkthrough of a full deployment lifecycle.

## GitHub Flow
1. **Step 1**: Buyer selects a node from the marketplace UI.
2. **Step 2**: Buyer enters GitHub URL, selects runtime, inputs install command, start command, and env vars.
3. **Step 3**: Buyer clicks Deploy.
4. **Step 4**: Frontend calls `POST /deployments` with `source_type: github`.
5. **Step 5**: Backend verifies credits and node resources, reserves capacity, and creates deployment record with `status: pending`.
6. **Step 6**: Backend generates subdomain (`{adj}-{noun}-{4hex}.peercloud.app`) and returns deployment ID.
7. **Step 7**: Node's 30-second heartbeat loop hits `/nodes/assigned-workloads` and picks up the new workload.
8. **Step 8**: Node runs `git clone` into the local `workloads/{id}/` directory.
9. **Step 9**: Node updates deployment status to `cloning` (via an internal status push).
10. **Step 10**: Clone completes. Node runs `install_cmd` and updates status to `installing`.
11. **Step 11**: Install completes. Node assigns process to Windows Job Object sandbox and runs `start_cmd`.
12. **Step 12**: Node updates status to `running`.
13. **Step 13**: Node begins pushing logs to `/nodes/push-logs` every 5 seconds.
14. **Step 14**: Node begins pushing telemetry to `/nodes/push-stats` every 10 seconds.
15. **Step 15**: Celery billing worker starts deducting credits every 60 seconds.
16. **Step 16**: Buyer sees `running` status and watches live terminal outputs and resource graphs in the app.

## Stop Flow
1. **Step 1**: Buyer clicks "Stop" in the UI.
2. **Step 2**: Frontend calls `DELETE /deployments/{id}`.
3. **Step 3**: Backend sets deployment `status` to `stopped`.
4. **Step 4**: Node heartbeat loop receives the updated state (or sees the workload is removed from active list).
5. **Step 5**: Node kills the child process and destroys the Job Object.
6. **Step 6**: Node flushes and pushes final logs.
7. **Step 7**: Billing loop ceases charging for this deployment.
8. **Step 8**: Deployment remains in history as `stopped`.

## Failover Flow (Node goes offline)
1. Node process crashes or host machine loses power.
2. Heartbeat stops.
3. `heartbeat_checker.py` celery worker notices `last_heartbeat_at` is older than timeout (90s).
4. Worker sets node status to `offline`.
5. Worker finds all `running` deployments assigned to this node.
6. Worker sets deployment statuses to `stopped` with `failure_reason: "Host node went offline"`.
7. Billing ceases automatically because status is no longer `running`.
8. Buyer UI updates to show failure reason.
