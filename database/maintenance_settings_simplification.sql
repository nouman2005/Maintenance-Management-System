-- Maintenance settings simplification: effective-dated flat maintenance revisions.
-- Additive only: it does not change or delete charges, payments, receipts, or rule data.

CREATE TABLE IF NOT EXISTS maintenance_revisions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  revision_code VARCHAR(30) NOT NULL UNIQUE,
  society_id INT NOT NULL,
  admin_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  revision_type ENUM('fixed_increase','per_sqft_increase') NOT NULL,
  increase_amount DECIMAL(12,2) NOT NULL,
  effective_from DATE NOT NULL,
  reason VARCHAR(255) NOT NULL,
  notes VARCHAR(500) NULL,
  request_key CHAR(64) NOT NULL,
  status ENUM('applied','reversed') NOT NULL DEFAULT 'applied',
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_revision_request (society_id, request_key),
  INDEX idx_revision_society_effective (society_id, effective_from),
  CONSTRAINT fk_revision_society FOREIGN KEY (society_id) REFERENCES societies(id),
  CONSTRAINT fk_revision_admin FOREIGN KEY (admin_id) REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS maintenance_revision_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  revision_id BIGINT NOT NULL,
  society_id INT NOT NULL,
  flat_id INT NOT NULL,
  previous_amount DECIMAL(12,2) NOT NULL,
  increase_amount DECIMAL(12,2) NOT NULL,
  new_amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_revision_flat (revision_id, flat_id),
  INDEX idx_revision_item_flat (flat_id, created_at),
  CONSTRAINT fk_revision_item_revision FOREIGN KEY (revision_id) REFERENCES maintenance_revisions(id),
  CONSTRAINT fk_revision_item_society FOREIGN KEY (society_id) REFERENCES societies(id),
  CONSTRAINT fk_revision_item_flat FOREIGN KEY (flat_id) REFERENCES flats(id)
);

CREATE TABLE IF NOT EXISTS flat_maintenance_amount_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  society_id INT NOT NULL,
  flat_id INT NOT NULL,
  revision_id BIGINT NULL,
  maintenance_amount DECIMAL(12,2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  reason VARCHAR(255) NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_flat_maintenance_effective (flat_id, effective_from),
  INDEX idx_flat_amount_history_lookup (society_id, flat_id, effective_from),
  CONSTRAINT fk_flat_amount_history_society FOREIGN KEY (society_id) REFERENCES societies(id),
  CONSTRAINT fk_flat_amount_history_flat FOREIGN KEY (flat_id) REFERENCES flats(id),
  CONSTRAINT fk_flat_amount_history_revision FOREIGN KEY (revision_id) REFERENCES maintenance_revisions(id),
  CONSTRAINT fk_flat_amount_history_admin FOREIGN KEY (created_by) REFERENCES admins(id)
);

-- Baseline rows let future-period billing select an amount without changing old bills.
INSERT INTO flat_maintenance_amount_history
  (society_id, flat_id, maintenance_amount, effective_from, reason, created_by)
SELECT f.society_id, f.id, f.maintenance_amount, '1900-01-01',
       'Baseline amount before maintenance revision history', f.admin_id
FROM flats f
LEFT JOIN flat_maintenance_amount_history h ON h.flat_id = f.id
WHERE h.id IS NULL;
