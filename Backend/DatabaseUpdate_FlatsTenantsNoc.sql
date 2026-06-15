-- Run this once on an existing database before using the updated flats,
-- tenants, and society-wise NOC charge features.

ALTER TABLE flats
  ADD COLUMN flat_code VARCHAR(20) NULL UNIQUE AFTER id;

UPDATE flats
SET flat_code = CONCAT('FLT-', UPPER(SUBSTRING(MD5(CONCAT(id, '-', NOW())), 1, 10)))
WHERE flat_code IS NULL;

ALTER TABLE flats
  MODIFY flat_code VARCHAR(20) NOT NULL;

ALTER TABLE tenants
  ADD COLUMN tenant_code VARCHAR(20) NULL UNIQUE AFTER id,
  ADD COLUMN maintenance_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER exit_letter_submitted,
  ADD COLUMN noc_charge DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER maintenance_amount,
  ADD COLUMN total_monthly_charge DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER noc_charge;

UPDATE tenants t
JOIN flats f ON f.id = t.flat_id
SET t.tenant_code = CONCAT('TNT-', UPPER(SUBSTRING(MD5(CONCAT(t.id, '-', NOW())), 1, 10))),
    t.maintenance_amount = f.maintenance_amount,
    t.total_monthly_charge = f.maintenance_amount + t.noc_charge
WHERE t.tenant_code IS NULL;

ALTER TABLE tenants
  MODIFY tenant_code VARCHAR(20) NOT NULL;

ALTER TABLE tenants
  DROP INDEX uk_flat_active_tenant;

ALTER TABLE tenants
  ADD COLUMN active_flat_id INT GENERATED ALWAYS AS (
    CASE WHEN status = 'active' THEN flat_id ELSE NULL END
  ) STORED,
  ADD UNIQUE KEY uk_flat_active_tenant (active_flat_id);

ALTER TABLE maintenance_settings
  ADD COLUMN setting_code VARCHAR(20) NULL UNIQUE AFTER id;

UPDATE maintenance_settings
SET setting_code = CONCAT('SET-', UPPER(SUBSTRING(MD5(CONCAT(id, '-', NOW())), 1, 10)))
WHERE setting_code IS NULL;

ALTER TABLE maintenance_settings
  MODIFY setting_code VARCHAR(20) NOT NULL;

ALTER TABLE maintenance_settings
  MODIFY setting_key ENUM(
    'base_maintenance',
    'per_sqft_rate',
    'late_fee',
    'parking_fee',
    'noc_charge'
  ) NOT NULL;

ALTER TABLE maintenance_settings
  DROP INDEX uk_society_setting_active;

ALTER TABLE maintenance_settings
  ADD COLUMN active_setting_key VARCHAR(50) GENERATED ALWAYS AS (
    CASE WHEN status = 'active' THEN setting_key ELSE NULL END
  ) STORED,
  ADD UNIQUE KEY uk_society_setting_active (society_id, active_setting_key);
