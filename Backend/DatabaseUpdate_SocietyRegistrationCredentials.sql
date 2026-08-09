-- Adds temporary-password tracking for society admins created from
-- registration approvals, plus an audit trail for approval/rejection actions.

ALTER TABLE admins
  ADD COLUMN password_must_change BOOLEAN NOT NULL DEFAULT FALSE AFTER phone,
  ADD COLUMN temporary_password_created_at TIMESTAMP NULL AFTER password_must_change,
  ADD COLUMN password_changed_at TIMESTAMP NULL AFTER temporary_password_created_at;

CREATE TABLE IF NOT EXISTS society_registration_audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  registration_request_id INT NOT NULL,
  society_id INT NULL,
  super_admin_id INT NOT NULL,

  action ENUM('approved','rejected') NOT NULL,
  details JSON NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_society_registration_audit_request (registration_request_id),
  INDEX idx_society_registration_audit_society (society_id),
  INDEX idx_society_registration_audit_super_admin (super_admin_id),

  CONSTRAINT fk_registration_audit_request
    FOREIGN KEY (registration_request_id)
    REFERENCES society_registration_requests(id),

  CONSTRAINT fk_registration_audit_society
    FOREIGN KEY (society_id)
    REFERENCES societies(id),

  CONSTRAINT fk_registration_audit_super_admin
    FOREIGN KEY (super_admin_id)
    REFERENCES super_admins(id)
);
