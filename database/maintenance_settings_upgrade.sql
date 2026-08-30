-- Maintenance Settings Upgrade: Billing Rules and Penalty Engine
-- Execute once after the base schema is installed.
-- This migration is additive and preserves existing maintenance settings,
-- maintenance charges, payments, receipts, and ledgers.

ALTER TABLE maintenance_rule_configs
  ADD COLUMN IF NOT EXISTS maintenance_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER name,
  ADD COLUMN IF NOT EXISTS billing_frequency ENUM('monthly') NOT NULL DEFAULT 'monthly' AFTER maintenance_amount,
  ADD COLUMN IF NOT EXISTS due_day TINYINT NOT NULL DEFAULT 10 AFTER billing_frequency,
  ADD COLUMN IF NOT EXISTS noc_enabled BOOLEAN NOT NULL DEFAULT TRUE AFTER due_day,
  ADD COLUMN IF NOT EXISTS noc_calculation_type ENUM('fixed','percentage') NOT NULL DEFAULT 'fixed' AFTER noc_enabled,
  ADD COLUMN IF NOT EXISTS noc_value DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER noc_calculation_type,
  ADD COLUMN IF NOT EXISTS late_fee_enabled BOOLEAN NOT NULL DEFAULT TRUE AFTER noc_value,
  ADD COLUMN IF NOT EXISTS penalty_type ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage' AFTER late_fee_enabled,
  ADD COLUMN IF NOT EXISTS penalty_rate_value DECIMAL(8,4) NOT NULL DEFAULT 0.0000 AFTER penalty_type,
  ADD COLUMN IF NOT EXISTS penalty_rate_period ENUM('monthly','yearly') NOT NULL DEFAULT 'monthly' AFTER penalty_rate_value,
  ADD COLUMN IF NOT EXISTS penalty_frequency ENUM('one_time','monthly') NOT NULL DEFAULT 'monthly' AFTER penalty_rate_period,
  ADD COLUMN IF NOT EXISTS penalty_method ENUM('simple','compound') NOT NULL DEFAULT 'simple' AFTER penalty_frequency,
  ADD COLUMN IF NOT EXISTS penalty_base ENUM('original_eligible_charges','current_outstanding','outstanding_including_previous_penalties') NOT NULL DEFAULT 'original_eligible_charges' AFTER penalty_method,
  ADD COLUMN IF NOT EXISTS penalty_applies_maintenance BOOLEAN NOT NULL DEFAULT TRUE AFTER penalty_base,
  ADD COLUMN IF NOT EXISTS penalty_applies_noc BOOLEAN NOT NULL DEFAULT FALSE AFTER penalty_applies_maintenance,
  ADD COLUMN IF NOT EXISTS grace_days INT NOT NULL DEFAULT 0 AFTER penalty_applies_noc,
  ADD COLUMN IF NOT EXISTS max_penalty_enabled BOOLEAN NOT NULL DEFAULT FALSE AFTER grace_days,
  ADD COLUMN IF NOT EXISTS max_penalty_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER max_penalty_enabled;

UPDATE maintenance_rule_configs
SET penalty_rate_value = COALESCE(NULLIF(penalty_rate_value, 0), interest_rate_monthly, 0),
    grace_days = COALESCE(NULLIF(grace_days, 0), interest_grace_days, 0),
    penalty_method = CASE
      WHEN interest_method = 'compound_monthly' THEN 'compound'
      ELSE penalty_method
    END,
    penalty_applies_noc = CASE
      WHEN exclude_noc_from_interest = 0 THEN TRUE
      ELSE penalty_applies_noc
    END,
    late_fee_enabled = CASE
      WHEN COALESCE(interest_rate_monthly, 0) > 0 THEN TRUE
      ELSE late_fee_enabled
    END;

ALTER TABLE maintenance_charges
  ADD COLUMN IF NOT EXISTS rule_id INT NULL AFTER flat_id,
  ADD COLUMN IF NOT EXISTS previous_outstanding DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER penalty_charge,
  ADD COLUMN IF NOT EXISTS current_charge DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER previous_outstanding,
  ADD COLUMN IF NOT EXISTS penalty_eligibility_date DATE NULL AFTER due_date,
  ADD COLUMN IF NOT EXISTS settings_snapshot JSON NULL AFTER notes,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP NULL AFTER settings_snapshot,
  ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255) NULL AFTER cancelled_at;

UPDATE maintenance_charges
SET current_charge = CASE
      WHEN current_charge = 0 THEN maintenance_charge + noc_charge
      ELSE current_charge
    END,
    penalty_eligibility_date = COALESCE(penalty_eligibility_date, due_date);

CREATE TABLE IF NOT EXISTS maintenance_setting_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  society_id INT NOT NULL,
  admin_id INT NOT NULL,
  rule_id INT NULL,
  action VARCHAR(50) NOT NULL,
  before_data JSON NULL,
  after_data JSON NULL,
  reason VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_setting_history_society (society_id, created_at),
  INDEX idx_setting_history_rule (rule_id),
  INDEX idx_setting_history_admin (admin_id),

  CONSTRAINT fk_setting_history_society
    FOREIGN KEY (society_id) REFERENCES societies(id),
  CONSTRAINT fk_setting_history_admin
    FOREIGN KEY (admin_id) REFERENCES admins(id),
  CONSTRAINT fk_setting_history_rule
    FOREIGN KEY (rule_id) REFERENCES maintenance_rule_configs(id)
);

CREATE TABLE IF NOT EXISTS maintenance_penalty_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  society_id INT NOT NULL,
  admin_id INT NOT NULL,
  flat_id INT NOT NULL,
  charge_id INT NOT NULL,
  rule_id INT NULL,
  period_month DATE NOT NULL,
  penalty_event_key VARCHAR(80) NOT NULL,
  penalty_base_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  penalty_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  settings_snapshot JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_penalty_event_once (society_id, flat_id, period_month, penalty_event_key),
  INDEX idx_penalty_event_charge (charge_id),
  INDEX idx_penalty_event_society_period (society_id, period_month),

  CONSTRAINT fk_penalty_event_society
    FOREIGN KEY (society_id) REFERENCES societies(id),
  CONSTRAINT fk_penalty_event_admin
    FOREIGN KEY (admin_id) REFERENCES admins(id),
  CONSTRAINT fk_penalty_event_flat
    FOREIGN KEY (flat_id) REFERENCES flats(id),
  CONSTRAINT fk_penalty_event_charge
    FOREIGN KEY (charge_id) REFERENCES maintenance_charges(id),
  CONSTRAINT fk_penalty_event_rule
    FOREIGN KEY (rule_id) REFERENCES maintenance_rule_configs(id)
);

INSERT INTO maintenance_setting_history
  (society_id, admin_id, rule_id, action, before_data, after_data, reason)
SELECT mrc.society_id,
       mrc.admin_id,
       mrc.id,
       'migration_snapshot',
       NULL,
       JSON_OBJECT(
         'name', mrc.name,
         'interest_rate_monthly', mrc.interest_rate_monthly,
         'interest_grace_days', mrc.interest_grace_days,
         'interest_method', mrc.interest_method,
         'interest_apply_to', mrc.interest_apply_to,
         'penalty_rate_value', mrc.penalty_rate_value,
         'penalty_method', mrc.penalty_method,
         'penalty_base', mrc.penalty_base
       ),
       'Initial snapshot created by maintenance settings upgrade'
FROM maintenance_rule_configs mrc
LEFT JOIN maintenance_setting_history msh
  ON msh.rule_id = mrc.id
 AND msh.action = 'migration_snapshot'
WHERE msh.id IS NULL;
