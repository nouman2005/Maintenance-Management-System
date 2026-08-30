# Maintenance Settings and Billing Rules

## Settings Architecture

Maintenance settings are society-specific. Each admin operates inside `req.user.society_id`, and billing rules are stored in `maintenance_rule_configs`.

The upgrade keeps the existing maintenance tables and extends them with richer rule fields. Old rows remain intact, while new bills store a calculation snapshot so future settings changes do not rewrite history.

## Rule Model

Each active billing rule can configure:

- Maintenance amount
- Monthly billing frequency
- Due day
- NOC enabled/disabled
- NOC fixed or percentage calculation
- Late fee enabled/disabled
- Percentage or fixed penalty
- Monthly or yearly rate period
- One-time or monthly penalty frequency
- Simple or compound method
- Penalty base
- Penalty target charges: maintenance and/or NOC
- Grace period
- Optional maximum penalty
- Effective date

Only one active rule is used per society. Saving a new rule deactivates the previous active rule and records a history entry.

## Late Fee Logic

The backend service is `Backend/Services/maintenanceBillingService.js`.

General formula:

`Previous Outstanding + Current Charges + Applicable Penalty - Payments = Current Outstanding`

Current charges are:

`Maintenance + NOC`

Penalty is applied only when the bill has passed:

`Due Date + Grace Days`

The current month is not penalized before it becomes eligible.

## Simple Penalty

Simple penalty can be configured with `penalty_base = original_eligible_charges`.

This calculates penalty against the selected eligible charges:

- Maintenance
- NOC
- Maintenance + NOC

It does not automatically apply penalty to previous penalty amounts.

## Compound Penalty

Compound behavior is enabled with:

- `penalty_method = compound`
- `penalty_base = outstanding_including_previous_penalties`

This allows the penalty base to include previous outstanding plus current eligible charges, matching the carry-forward examples in the requirement.

## NOC Rules

NOC is configurable as:

- Disabled
- Fixed amount
- Percentage of maintenance

NOC applies only when the flat has an active tenant. Existing tenant/occupancy behavior is preserved.

## Rate Conversion

For this product:

`Yearly Rate / 12 = Monthly Rate`

Example:

`12% yearly = 1% monthly`

The frontend preview displays the conversion, while backend calculation remains authoritative.

## Bill Snapshot

New maintenance bills store:

- `rule_id`
- `previous_outstanding`
- `current_charge`
- `penalty_eligibility_date`
- `settings_snapshot`

The snapshot preserves the exact billing inputs used for that monthly charge.

## Duplicate Protection

Existing monthly charge uniqueness remains:

`UNIQUE (society_id, flat_id, period_month)`

The upgrade adds `maintenance_penalty_events` with:

`UNIQUE (society_id, flat_id, period_month, penalty_event_key)`

This supports idempotent penalty events and prevents duplicate penalties for the same billing period/event.

Maintenance payment allocation remains deterministic through the existing `maintenance_payment_allocations` table.

## Payment Allocation

The existing backend allocates payments to outstanding charges in oldest-period-first order. For each monthly charge it allocates:

1. Maintenance balance
2. NOC balance
3. Interest/penalty balance

The allocation rows remain traceable through `maintenance_payment_allocations`.

## APIs

Existing APIs remain:

- `GET /api/v1/maintenance/rules`
- `POST /api/v1/maintenance/rules`
- `POST /api/v1/maintenance/generate-monthly`
- `POST /api/v1/maintenance/payments`
- `GET /api/v1/maintenance/flats/:flatId`

Added APIs:

- `GET /api/v1/maintenance/rules/history`
- `GET /api/v1/maintenance/rules/:id/history`
- `POST /api/v1/maintenance/calculation-preview`
- `GET /api/v1/maintenance/statement/:flatId`

## Database Migration

Run:

`database/maintenance_settings_upgrade.sql`

The migration:

- Adds rule fields to `maintenance_rule_configs`
- Adds snapshot and carry-forward fields to `maintenance_charges`
- Creates `maintenance_setting_history`
- Creates `maintenance_penalty_events`
- Backfills compatible values from legacy interest settings

It does not drop or delete existing records.

## Frontend

The Maintenance Settings UI now has:

- General Maintenance
- NOC / Tenant Charges
- Late Fee / Penalty
- Advanced Rules
- Live Calculation Preview
- Billing Rules list
- Read-only rule detail modal
- Recent history

Advanced options are collapsed by default so a normal society admin can configure the common case without accounting knowledge.

## Regression Notes

Existing flats, tenants, maintenance charges, payments, receipts, reports, and finance integration remain on the same tables and routes. New billing calculations are introduced through the existing monthly generation flow.
