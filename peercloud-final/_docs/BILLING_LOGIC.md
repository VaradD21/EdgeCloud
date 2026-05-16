# Billing Logic

## Credit Unit
The internal currency of PeerCloud is the `credit`.
In the MVP: **1 credit = 1 cent USD equivalent**.
Prices, balances, and charges are stored as integer `cents` to avoid floating point math errors.

## Setting Prices
When a Host creates a marketplace listing, they set a `price_per_hour_cents`. For example, a powerful node might cost 50 credits/hour.

## Per-Minute Deduction
Billing is calculated per minute.
Formula: `charge_per_minute = price_per_hour_cents / 60`
This value is rounded up to the nearest integer cent.

## The Billing Worker
A Celery task (`billing.charge_active_deployments`) runs on a strict 60-second schedule.
For each execution, it performs the following:
1. Queries the database for all deployments where `status == 'running'`.
2. For each deployment, calculates the seconds elapsed since `last_billed_at`.
3. Calculates `charge = (price_per_hour_cents / 3600) * seconds` elapsed, rounded up.
4. Queries the buyer's current `credit_balance_cents`.
5. **If balance >= charge**:
   - Deducts `charge` from the buyer's balance.
   - Inserts a `credit_transaction` record (`type: usage_charge`, `amount: -charge`).
   - Updates the deployment's `last_billed_at` to the current timestamp.
6. **If balance < charge** (Out of credits):
   - Sets the deployment's `status` to `stopped` with `failure_reason: "Out of credits"`.
   - Inserts a `credit_transaction` for whatever balance is remaining (draining the account to 0).
   - Sets the buyer's balance to 0.
   - On the node's next heartbeat, it sees the deployment is `stopped` and kills the process. The buyer receives a UI notification.

## Host Payout
1. Host requests a payout via the `EarningsPage` UI for accumulated credits.
2. The backend verifies the balance and creates a `credit_transaction` with `type: payout_request` (negative amount to deduct from their balance).
3. In the MVP, an admin manually reviews and processes these requests (integrations like Stripe or crypto payouts are planned for v2).

## Credit Topup
1. Buyer enters an amount on the `CreditsPage` UI.
2. In the MVP, this acts as a mock. The backend directly adds the requested credits to the buyer's balance.
3. Inserts a `credit_transaction` with `type: topup` (positive amount).
4. Stripe integration is planned for v2.
