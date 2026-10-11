-- Safe follow-up for the maintenance settings upgrade.
-- It preserves all existing rules and bills. Run once in the application database.

ALTER TABLE maintenance_rule_configs
  MODIFY COLUMN noc_calculation_type ENUM('fixed','percentage') NULL DEFAULT NULL,
  MODIFY COLUMN max_penalty_amount DECIMAL(12,2) NULL DEFAULT NULL,
  MODIFY COLUMN noc_value DECIMAL(12,2) NULL DEFAULT NULL,
  MODIFY COLUMN penalty_rate_value DECIMAL(8,4) NULL DEFAULT NULL;

-- Disabled optional charges must not retain an empty-string/zero sentinel as a value.
UPDATE maintenance_rule_configs
SET max_penalty_amount = NULL
WHERE max_penalty_enabled = FALSE;

UPDATE maintenance_rule_configs
SET noc_value = NULL
WHERE noc_enabled = FALSE;

UPDATE maintenance_rule_configs
SET penalty_rate_value = NULL
WHERE late_fee_enabled = FALSE;

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
  CONSTRAINT fk_setting_history_society FOREIGN KEY (society_id) REFERENCES societies(id),
  CONSTRAINT fk_setting_history_admin FOREIGN KEY (admin_id) REFERENCES admins(id),
  CONSTRAINT fk_setting_history_rule FOREIGN KEY (rule_id) REFERENCES maintenance_rule_configs(id)
);
