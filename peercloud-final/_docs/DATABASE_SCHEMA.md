# Database Schema

## `users`
- **id**: UUID primary key
- **email**: string unique indexed
- **hashed_password**: string
- **role**: enum (`host`, `buyer`, `both`)
- **credit_balance_cents**: integer default `0`
- **is_active**: boolean default `true`
- **created_at**: datetime UTC
- **updated_at**: datetime UTC
- *Purpose*: Stores user authentication, role, and the master credit balance for billing.

## `nodes`
- **id**: UUID primary key
- **user_id**: UUID foreign key `users.id`
- **display_name**: string
- **node_secret**: string (returned once on registration, hashed in DB)
- **cpu_cores_total**: float
- **cpu_cores_reserved**: float default `0`
- **ram_gb_total**: float
- **ram_gb_reserved**: float default `0`
- **disk_gb_total**: float
- **disk_gb_reserved**: float default `0`
- **price_per_hour_cents**: integer
- **uptime_score**: float default `100.0`
- **status**: enum (`online`, `offline`, `maintenance`)
- **last_heartbeat_at**: datetime nullable
- **platform**: string (`windows`, `linux`, `mac`)
- **agent_version**: string
- **created_at**: datetime UTC
- **updated_at**: datetime UTC
- *Purpose*: Represents a physical host machine running the PeerCloud desktop agent. Tracks total vs reserved hardware resources.

## `listings`
- **id**: UUID primary key
- **node_id**: UUID foreign key `nodes.id`
- **user_id**: UUID foreign key `users.id`
- **cpu_cores**: float
- **ram_gb**: float
- **disk_gb**: float
- **price_per_hour_cents**: integer
- **status**: enum (`active`, `paused`, `deleted`)
- **created_at**: datetime UTC
- **updated_at**: datetime UTC
- *Purpose*: The marketplace listing representing a slice of a node's resources that a buyer can rent.

## `deployments`
- **id**: UUID primary key
- **buyer_id**: UUID foreign key `users.id`
- **listing_id**: UUID foreign key `listings.id` set null
- **node_id**: UUID foreign key `nodes.id` set null
- **name**: string
- **source_type**: enum (`github`, `package`)
- **source_url**: string (github url or package url)
- **runtime**: enum (`python`, `node`, `binary`, `static`)
- **install_cmd**: string nullable
- **start_cmd**: string
- **port**: integer
- **env_vars**: json
- **subdomain**: string unique
- **status**: enum (`pending`, `cloning`, `installing`, `running`, `stopped`, `failed`)
- **failure_reason**: string nullable
- **started_at**: datetime nullable
- **stopped_at**: datetime nullable
- **last_billed_at**: datetime nullable
- **created_at**: datetime UTC
- **updated_at**: datetime UTC
- *Purpose*: Represents an active or historical workload rented by a buyer and assigned to a host node.

## `credit_transactions`
- **id**: UUID primary key
- **user_id**: UUID foreign key `users.id`
- **deployment_id**: UUID foreign key `deployments.id` set null
- **amount_cents**: integer (negative for charges, positive for credits added)
- **type**: enum (`topup`, `usage_charge`, `payout_request`, `refund`)
- **description**: string
- **created_at**: datetime UTC
- *Purpose*: An immutable ledger tracking all movements of credits (top-ups, per-minute usage charges, payouts).

## `uptime_logs`
- **id**: UUID primary key
- **node_id**: UUID foreign key `nodes.id` cascade delete
- **status**: enum (`online`, `offline`)
- **recorded_at**: datetime UTC
- *Indexes*: Composite index on (`node_id`, `recorded_at`)
- *Purpose*: Periodically recorded to compute a node's uptime score dynamically.

## `deployment_logs`
- **id**: UUID primary key
- **deployment_id**: UUID foreign key `deployments.id` cascade delete
- **line**: string
- **logged_at**: datetime UTC
- *Indexes*: Composite index on (`deployment_id`, `logged_at`)
- *Note*: Also mirrored in Redis for fast access.
- *Purpose*: Persistent storage of terminal outputs for workloads.
