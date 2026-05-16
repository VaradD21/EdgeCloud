# API Contracts

## Auth Endpoints
### `POST /auth/register`
- **Auth Required**: None
- **Request Body**: `{ "email": "test@example.com", "password": "securepassword", "role": "host" | "buyer" | "both" }`
- **Response**: `{ "access_token": "jwt...", "refresh_token": "jwt...", "user": { "id": "uuid", "email": "...", "role": "..." } }`
- **Description**: Creates a new user account, hashes the password, and returns JWT tokens.

### `POST /auth/login`
- **Auth Required**: None
- **Request Body**: `{ "email": "test@example.com", "password": "securepassword" }`
- **Response**: `{ "access_token": "jwt...", "refresh_token": "jwt...", "user": { ... } }`
- **Description**: Authenticates a user and returns JWT tokens.

### `POST /auth/refresh`
- **Auth Required**: None
- **Request Body**: `{ "refresh_token": "jwt..." }`
- **Response**: `{ "access_token": "jwt..." }`
- **Description**: Exchanges a valid refresh token for a new access token.

## Node Endpoints
### `POST /nodes/register`
- **Auth Required**: JWT (must be `host` or `both` role)
- **Request Body**: `{ "display_name": "My PC", "cpu_cores_total": 8.0, "ram_gb_total": 16.0, "disk_gb_total": 500.0, "price_per_hour_cents": 10, "platform": "windows", "agent_version": "0.1.0" }`
- **Response**: `{ "node_id": "uuid", "node_secret": "plain_text_secret" }`
- **Description**: Registers a new hardware node for the authenticated user and returns a secret that the node uses for all subsequent agent communications.

### `POST /nodes/heartbeat`
- **Auth Required**: `X-Node-Secret` header
- **Request Body**: `{ "node_id": "uuid", "cpu_percent": 15.5, "ram_gb_used": 4.2 }`
- **Response**: `{ "assigned_workloads": [ ...deployment_objects ] }`
- **Description**: Informs the backend that the node is online. Updates uptime logs. Returns any workloads assigned to this node that are not in stopped or failed status.

### `POST /nodes/push-logs`
- **Auth Required**: `X-Node-Secret` header
- **Request Body**: `{ "deployment_id": "uuid", "lines": ["Starting server...", "Listening on port 8080"] }`
- **Response**: `{ "status": "ok" }`
- **Description**: Pushes terminal output lines from a running workload. Appends to a Redis list (capped at 500 lines) and persists to `deployment_logs`.

### `POST /nodes/push-stats`
- **Auth Required**: `X-Node-Secret` header
- **Request Body**: `{ "deployment_id": "uuid", "cpu_percent": 2.5, "ram_mb_used": 150.0, "timestamp": "2026-05-10T12:00:00Z" }`
- **Response**: `{ "status": "ok" }`
- **Description**: Pushes telemetry stats for a specific deployment to a Redis list (capped at 120 entries).

### `GET /nodes/assigned-workloads`
- **Auth Required**: `X-Node-Secret` header
- **Response**: `[ { "id": "uuid", "source_type": "...", "source_url": "...", "runtime": "...", "install_cmd": "...", "start_cmd": "...", "port": 8080, "env_vars": {}, "cpu_cores": 1.0, "ram_mb": 512.0 } ]`
- **Description**: Returns all workloads assigned to this node that should be running.

## Listing Endpoints
### `GET /listings`
- **Auth Required**: None (Public)
- **Query Params**: `min_cpu` (float), `min_ram` (float), `max_price_cents` (int), `sort_by` (`price`|`rating`|`ram`)
- **Response**: `[ { "id": "uuid", "cpu_cores": 2.0, "ram_gb": 4.0, "price_per_hour_cents": 5, "node": { "uptime_score": 99.5, "display_name": "...", "platform": "windows" } } ]`
- **Description**: Fetches available active listings corresponding to online nodes.

### `POST /listings`
- **Auth Required**: JWT (`host` or `both` role)
- **Request Body**: `{ "node_id": "uuid", "cpu_cores": 2.0, "ram_gb": 4.0, "disk_gb": 20.0, "price_per_hour_cents": 5 }`
- **Response**: `{ "id": "uuid", ...listing_object }`
- **Description**: Creates a new marketplace listing, ensuring the requested resources are within the node's available capacity.

### `GET /listings/{id}`
- **Auth Required**: None
- **Response**: `{ ...listing_object, node: { ... } }`
- **Description**: Returns full details of a single listing.

### `PATCH /listings/{id}`
- **Auth Required**: JWT (owner only)
- **Request Body**: `{ "price_per_hour_cents": 6, "status": "paused" }`
- **Response**: `{ ...updated_listing_object }`
- **Description**: Modifies a listing.

### `DELETE /listings/{id}`
- **Auth Required**: JWT (owner only)
- **Response**: `{ "status": "deleted" }`
- **Description**: Soft deletes a listing by setting its status to `deleted`.

## Deployment Endpoints
### `POST /deployments`
- **Auth Required**: JWT (`buyer` or `both` role)
- **Request Body**: `{ "listing_id": "uuid", "name": "My App", "source_type": "github", "source_url": "https://...", "runtime": "node", "install_cmd": "npm install", "start_cmd": "npm start", "port": 3000, "env_vars": { "KEY": "VALUE" } }`
- **Response**: `{ "id": "uuid", "subdomain": "cool-dog-abcd.peercloud.app", "status": "pending", ... }`
- **Description**: Initiates a deployment. Reserves resources on the node, verifies the buyer has enough credits, generates a subdomain, and queues the workload.

### `GET /deployments`
- **Auth Required**: JWT
- **Response**: `[ { ...deployment_object } ]`
- **Description**: Returns all deployments belonging to the authenticated user.

### `GET /deployments/{id}`
- **Auth Required**: JWT (owner only)
- **Response**: `{ ...deployment_object }`
- **Description**: Fetches current status and metadata of a deployment.

### `DELETE /deployments/{id}`
- **Auth Required**: JWT (owner only)
- **Response**: `{ "status": "stopping" }`
- **Description**: Marks the deployment's status as `stopped`. The host node picks this up and kills the process.

### `GET /deployments/{id}/logs`
- **Auth Required**: JWT (owner only)
- **Response**: `[ "Starting server...", "Listening on 3000" ]`
- **Description**: Fetches the last 200 log lines from Redis.

### `GET /deployments/{id}/stats`
- **Auth Required**: JWT (owner only)
- **Response**: `[ { "cpu_percent": 2.5, "ram_mb_used": 150.0, "timestamp": "..." } ]`
- **Description**: Fetches the last 20 telemetry stats from Redis.

## Credit Endpoints
### `GET /credits/balance`
- **Auth Required**: JWT
- **Response**: `{ "balance_cents": 1500, "formatted": "15.00 credits" }`
- **Description**: Retrieves the user's current credit balance.

### `GET /credits/history`
- **Auth Required**: JWT
- **Response**: `[ { "id": "uuid", "amount_cents": -5, "type": "usage_charge", "description": "...", "created_at": "..." } ]`
- **Description**: Returns the last 50 transactions for the user.

### `POST /credits/topup`
- **Auth Required**: JWT (`buyer` or `both` role)
- **Request Body**: `{ "amount_cents": 1000 }`
- **Response**: `{ "balance_cents": 2500 }`
- **Description**: Mocks adding credits to the user's balance and creates a `topup` transaction.

## Admin Endpoints
### `GET /admin/nodes`
- **Auth Required**: JWT (admin only)
- **Response**: `[ { ...node_object } ]`

### `GET /admin/deployments`
- **Auth Required**: JWT (admin only)
- **Response**: `[ { ...deployment_object } ]`

### `POST /admin/nodes/{id}/suspend`
- **Auth Required**: JWT (admin only)
- **Response**: `{ "status": "suspended" }`
