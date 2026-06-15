-- Adds separated maintenance, NOC, and interest payment/balance tracking.
-- Run this once on existing databases before deploying the updated maintenance module.

ALTER TABLE maintenance_charges
  ADD COLUMN noc_paid DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER maintenance_paid,
  ADD COLUMN noc_balance DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER maintenance_balance;

ALTER TABLE maintenance_payments
  ADD COLUMN maintenance_amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER amount,
  ADD COLUMN noc_amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER maintenance_amount_paid,
  ADD COLUMN interest_amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER noc_amount_paid,
  ADD COLUMN from_month DATE NULL AFTER interest_amount_paid,
  ADD COLUMN to_month DATE NULL AFTER from_month;

ALTER TABLE maintenance_payment_allocations
  ADD COLUMN noc_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER maintenance_amount;

UPDATE maintenance_charges
SET
  noc_balance = GREATEST(noc_charge - noc_paid, 0),
  maintenance_balance = GREATEST(maintenance_charge + penalty_charge - maintenance_paid, 0),
  total_balance = GREATEST(maintenance_charge + penalty_charge - maintenance_paid, 0)
    + GREATEST(noc_charge - noc_paid, 0)
    + interest_balance;

UPDATE maintenance_payments
SET maintenance_amount_paid = GREATEST(amount - interest_amount_paid - noc_amount_paid, 0)
WHERE maintenance_amount_paid = 0
  AND noc_amount_paid = 0
  AND interest_amount_paid = 0;
