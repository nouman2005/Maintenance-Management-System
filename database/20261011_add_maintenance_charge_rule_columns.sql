-- Brings existing maintenance_charges tables in line with upsertCharge().
-- Additive and safe for existing bills, payments, receipts, and balances.

ALTER TABLE maintenance_charges
  ADD COLUMN rule_id INT NULL AFTER flat_id,
  ADD COLUMN previous_outstanding DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER penalty_charge,
  ADD COLUMN current_charge DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER previous_outstanding,
  ADD COLUMN penalty_eligibility_date DATE NULL AFTER due_date,
  ADD COLUMN settings_snapshot JSON NULL AFTER notes,
  ADD COLUMN cancelled_at TIMESTAMP NULL AFTER settings_snapshot,
  ADD COLUMN cancellation_reason VARCHAR(255) NULL AFTER cancelled_at;

UPDATE maintenance_charges
SET current_charge = CASE
      WHEN current_charge = 0 THEN maintenance_charge + noc_charge
      ELSE current_charge
    END,
    penalty_eligibility_date = COALESCE(penalty_eligibility_date, due_date);

ALTER TABLE maintenance_charges
  ADD CONSTRAINT fk_charge_rule
  FOREIGN KEY (rule_id) REFERENCES maintenance_rule_configs(id);
