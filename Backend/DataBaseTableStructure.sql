-- CREATE SUPER ADMINS TABLE MYSQL MODEL
CREATE TABLE super_admins (
  id INT AUTO_INCREMENT PRIMARY KEY,

  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(15),

  role ENUM('super_admin') DEFAULT 'super_admin',
  status ENUM('active','inactive') DEFAULT 'active',

  refresh_token TEXT NULL,
  last_login_at TIMESTAMP NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
);

-- Add index after table creation
CREATE INDEX idx_super_admins_email
ON super_admins (email);

-- CREATE SOCIETY REGISTRATION REQUESTS TABLE MYSQL MODEL
CREATE TABLE society_registration_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,

  society_name VARCHAR(150) NOT NULL,
  registration_number VARCHAR(50) NOT NULL UNIQUE,
  total_flats INT NOT NULL,
  society_phone VARCHAR(15),
  society_email VARCHAR(100),
  address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),

  admin_name VARCHAR(100) NOT NULL,
  admin_email VARCHAR(100) NOT NULL,
  admin_phone VARCHAR(15),

  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  reviewed_by_super_admin_id INT NULL,
  reviewed_at TIMESTAMP NULL,
  rejection_reason VARCHAR(255) NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_society_request_status (status),
  INDEX idx_society_request_email (admin_email),
  INDEX idx_society_request_registration (registration_number),
  INDEX idx_society_request_reviewer (reviewed_by_super_admin_id),

  CONSTRAINT fk_society_request_reviewer
    FOREIGN KEY (reviewed_by_super_admin_id)
    REFERENCES super_admins(id)
);

-- CREATE SOCIETIES TABLE MYSQL MODEL
CREATE TABLE societies (
  id INT AUTO_INCREMENT PRIMARY KEY,

  society_name VARCHAR(150) NOT NULL UNIQUE,
  registration_number VARCHAR(50) NOT NULL UNIQUE,
  total_flats INT NOT NULL,
  society_phone VARCHAR(15),
  society_email VARCHAR(100),
  address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),

  created_by_super_admin_id INT NOT NULL,

  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_society_creator (created_by_super_admin_id),

  CONSTRAINT fk_society_super_admin
    FOREIGN KEY (created_by_super_admin_id)
    REFERENCES super_admins(id)
);

-- CREATE ADMIN TABLE MYSQL MODEL
CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,

  society_id INT NOT NULL,
  created_by_super_admin_id INT NOT NULL,

  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(15),

  role ENUM('admin') DEFAULT 'admin',
  status ENUM('active','inactive') DEFAULT 'active',

  refresh_token TEXT NULL,
  last_login_at TIMESTAMP NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_admin_society (society_id),
  INDEX idx_admin_creator (created_by_super_admin_id),
  INDEX idx_admin_email (email),

  CONSTRAINT fk_admin_society
    FOREIGN KEY (society_id)
    REFERENCES societies(id),

  CONSTRAINT fk_admin_creator
    FOREIGN KEY (created_by_super_admin_id)
    REFERENCES super_admins(id)
);

-- CREATE FLATS TABLE MYSQL MODEL
CREATE TABLE flats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flat_code VARCHAR(20) NOT NULL UNIQUE,

  society_id INT NOT NULL,
  admin_id INT NOT NULL,

  wing VARCHAR(10) NOT NULL,
  floor_no INT NOT NULL,
  flat_no VARCHAR(10) NOT NULL,
  area_sqft INT,

  owner_name VARCHAR(100) NOT NULL,
  owner_phone VARCHAR(15) NOT NULL,
  owner_whatsapp VARCHAR(15),
  owner_email VARCHAR(100),

  maintenance_amount DECIMAL(10,2) NOT NULL COMMENT 'Current maintenance amount snapshot',

  occupancy ENUM('owner','tenant') DEFAULT 'owner',
  status ENUM('active','inactive') DEFAULT 'active',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_society_flat (society_id, wing, flat_no),
  INDEX idx_flat_society (society_id),
  INDEX idx_flat_admin (admin_id),
  INDEX idx_flat_occupancy (occupancy),

  CONSTRAINT fk_flat_society
    FOREIGN KEY (society_id)
    REFERENCES societies(id),

  CONSTRAINT fk_flat_admin
    FOREIGN KEY (admin_id)
    REFERENCES admins(id)
);

-- CREATE TENANTS TABLE MYSQL MODEL
CREATE TABLE tenants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_code VARCHAR(20) NOT NULL UNIQUE,

  society_id INT NOT NULL,
  admin_id INT NOT NULL,
  flat_id INT NOT NULL,

  tenant_name VARCHAR(100) NOT NULL,
  tenant_phone VARCHAR(15) NOT NULL,
  tenant_whatsapp VARCHAR(15),
  tenant_email VARCHAR(100),

  move_in_date DATE NOT NULL,
  move_out_date DATE NULL,

  exit_letter_submitted BOOLEAN DEFAULT FALSE,
  maintenance_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  noc_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_monthly_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('active','inactive') DEFAULT 'active',
  active_flat_id INT GENERATED ALWAYS AS (
    CASE WHEN status = 'active' THEN flat_id ELSE NULL END
  ) STORED,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  -- One active tenant per flat; many inactive tenant history rows are allowed.
  UNIQUE KEY uk_flat_active_tenant (active_flat_id),

  INDEX idx_tenant_society (society_id),
  INDEX idx_tenant_admin (admin_id),
  INDEX idx_tenant_flat (flat_id),
  INDEX idx_tenant_status (status),

  CONSTRAINT fk_tenant_society
    FOREIGN KEY (society_id)
    REFERENCES societies(id),

  CONSTRAINT fk_tenant_admin
    FOREIGN KEY (admin_id)
    REFERENCES admins(id),

  CONSTRAINT fk_tenant_flat
    FOREIGN KEY (flat_id)
    REFERENCES flats(id),

  CONSTRAINT chk_move_dates
    CHECK (move_out_date IS NULL OR move_out_date >= move_in_date)
);

-- CREATE MAINTENANCE SETTING TABLE MYSQL MODEL
CREATE TABLE maintenance_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_code VARCHAR(20) NOT NULL UNIQUE,

  society_id INT NOT NULL,
  admin_id INT NOT NULL,

  setting_key ENUM(
    'base_maintenance',
    'per_sqft_rate',
    'late_fee',
    'parking_fee',
    'noc_charge'
  ) NOT NULL,

  setting_value DECIMAL(10,2) NOT NULL,
  value_type ENUM('fixed','percentage','per_sqft') DEFAULT 'fixed',

  description VARCHAR(255),
  status ENUM('active','inactive') DEFAULT 'active',
  active_setting_key VARCHAR(50) GENERATED ALWAYS AS (
    CASE WHEN status = 'active' THEN setting_key ELSE NULL END
  ) STORED,

  effective_from DATE NOT NULL DEFAULT (CURRENT_DATE),
  effective_to DATE NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_society_setting_active (society_id, active_setting_key),

  INDEX idx_maintenance_society (society_id),
  INDEX idx_maintenance_admin (admin_id),
  INDEX idx_maintenance_key (setting_key),

  CONSTRAINT fk_maintenance_society
    FOREIGN KEY (society_id)
    REFERENCES societies(id),

  CONSTRAINT fk_maintenance_admin
    FOREIGN KEY (admin_id)
    REFERENCES admins(id),

  CONSTRAINT chk_effective_dates
    CHECK (effective_to IS NULL OR effective_to > effective_from)
);

-- CREATE PRODUCTION MAINTENANCE RULE CONFIGURATION TABLE
CREATE TABLE maintenance_rule_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rule_code VARCHAR(20) NOT NULL UNIQUE,

  society_id INT NOT NULL,
  admin_id INT NOT NULL,

  name VARCHAR(100) NOT NULL,
  interest_rate_monthly DECIMAL(8,4) NOT NULL DEFAULT 0
    COMMENT 'Monthly interest percentage, e.g. 1.3 means 1.3%',
  interest_grace_days INT NOT NULL DEFAULT 0,
  interest_method ENUM('simple_monthly','compound_monthly','fixed_penalty')
    NOT NULL DEFAULT 'simple_monthly',
  interest_apply_to ENUM(
    'maintenance_only',
    'maintenance_and_penalties',
    'total_outstanding'
  ) NOT NULL DEFAULT 'maintenance_only',
  exclude_noc_from_interest BOOLEAN NOT NULL DEFAULT TRUE,
  rounding_mode ENUM('nearest','floor','ceil','none') NOT NULL DEFAULT 'nearest',

  status ENUM('active','inactive') DEFAULT 'active',
  active_society_id INT GENERATED ALWAYS AS (
    CASE WHEN status = 'active' THEN society_id ELSE NULL END
  ) STORED,

  effective_from DATE NOT NULL DEFAULT (CURRENT_DATE),
  effective_to DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_active_maintenance_rule (active_society_id),
  INDEX idx_rule_society (society_id),
  INDEX idx_rule_admin (admin_id),

  CONSTRAINT fk_rule_society
    FOREIGN KEY (society_id)
    REFERENCES societies(id),

  CONSTRAINT fk_rule_admin
    FOREIGN KEY (admin_id)
    REFERENCES admins(id),

  CONSTRAINT chk_rule_effective_dates
    CHECK (effective_to IS NULL OR effective_to > effective_from)
);

-- CREATE MONTHLY MAINTENANCE LEDGER TABLE
CREATE TABLE maintenance_charges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  charge_code VARCHAR(20) NOT NULL UNIQUE,

  society_id INT NOT NULL,
  admin_id INT NOT NULL,
  flat_id INT NOT NULL,

  period_month DATE NOT NULL COMMENT 'Always first day of month',
  due_date DATE NULL,

  maintenance_charge DECIMAL(12,2) NOT NULL DEFAULT 0,
  noc_charge DECIMAL(12,2) NOT NULL DEFAULT 0,
  penalty_charge DECIMAL(12,2) NOT NULL DEFAULT 0,
  interest_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_due DECIMAL(12,2) NOT NULL DEFAULT 0,

  maintenance_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  noc_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  interest_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_paid DECIMAL(12,2) NOT NULL DEFAULT 0,

  maintenance_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  noc_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  interest_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_balance DECIMAL(12,2) NOT NULL DEFAULT 0,

  status ENUM('unpaid','partial','paid','waived') DEFAULT 'unpaid',
  source ENUM('manual','import','system','old_due') DEFAULT 'manual',
  notes VARCHAR(255) NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_flat_period_charge (society_id, flat_id, period_month),
  INDEX idx_charge_society_period (society_id, period_month),
  INDEX idx_charge_flat (flat_id),
  INDEX idx_charge_flat_period (flat_id, period_month),
  INDEX idx_charge_due_date (due_date),
  INDEX idx_charge_status (status),
  INDEX idx_charge_balance (society_id, total_balance),

  CONSTRAINT fk_charge_society
    FOREIGN KEY (society_id)
    REFERENCES societies(id),

  CONSTRAINT fk_charge_admin
    FOREIGN KEY (admin_id)
    REFERENCES admins(id),

  CONSTRAINT fk_charge_flat
    FOREIGN KEY (flat_id)
    REFERENCES flats(id)
);

-- CREATE MAINTENANCE PAYMENT TABLE
CREATE TABLE maintenance_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_code VARCHAR(20) NOT NULL UNIQUE,

  society_id INT NOT NULL,
  admin_id INT NOT NULL,
  flat_id INT NOT NULL,

  payment_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  amount DECIMAL(12,2) NOT NULL,
  maintenance_amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  noc_amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  interest_amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  from_month DATE NULL COMMENT 'First day of the first maintenance month paid',
  to_month DATE NULL COMMENT 'First day of the last maintenance month paid',
  payment_mode ENUM('cash','cheque','upi','bank_transfer','card','adjustment')
    DEFAULT 'cash',
  reference_no VARCHAR(100) NULL,
  receipt_number VARCHAR(30) NOT NULL UNIQUE,
  notes VARCHAR(255) NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_payment_society_date (society_id, payment_date),
  INDEX idx_payment_flat (flat_id),
  INDEX idx_payment_reference (reference_no),
  INDEX idx_payment_receipt (receipt_number),

  CONSTRAINT fk_payment_society
    FOREIGN KEY (society_id)
    REFERENCES societies(id),

  CONSTRAINT fk_payment_admin
    FOREIGN KEY (admin_id)
    REFERENCES admins(id),

  CONSTRAINT fk_payment_flat
    FOREIGN KEY (flat_id)
    REFERENCES flats(id)
);

-- CREATE FLAT-WISE MAINTENANCE LEDGER TABLE
CREATE TABLE maintenance_ledger_entries (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  society_id INT NOT NULL,
  admin_id INT NOT NULL,
  flat_id INT NOT NULL,
  charge_id INT NULL,
  payment_id INT NULL,

  entry_date DATE NOT NULL,
  period_month DATE NULL,
  entry_type ENUM('opening','charge','interest','penalty','payment','adjustment','waiver')
    NOT NULL,
  description VARCHAR(255) NOT NULL,
  debit_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  credit_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_after DECIMAL(12,2) NOT NULL DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_ledger_flat_date (flat_id, entry_date, id),
  INDEX idx_ledger_society_date (society_id, entry_date),
  INDEX idx_ledger_charge (charge_id),
  INDEX idx_ledger_payment (payment_id),

  CONSTRAINT fk_ledger_society
    FOREIGN KEY (society_id)
    REFERENCES societies(id),

  CONSTRAINT fk_ledger_admin
    FOREIGN KEY (admin_id)
    REFERENCES admins(id),

  CONSTRAINT fk_ledger_flat
    FOREIGN KEY (flat_id)
    REFERENCES flats(id),

  CONSTRAINT fk_ledger_charge
    FOREIGN KEY (charge_id)
    REFERENCES maintenance_charges(id),

  CONSTRAINT fk_ledger_payment
    FOREIGN KEY (payment_id)
    REFERENCES maintenance_payments(id)
);

-- CREATE PAYMENT ALLOCATION TABLE
CREATE TABLE maintenance_payment_allocations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id INT NOT NULL,
  charge_id INT NOT NULL,
  maintenance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  noc_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  interest_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_allocation_payment (payment_id),
  INDEX idx_allocation_charge (charge_id),

  CONSTRAINT fk_allocation_payment
    FOREIGN KEY (payment_id)
    REFERENCES maintenance_payments(id),

  CONSTRAINT fk_allocation_charge
    FOREIGN KEY (charge_id)
    REFERENCES maintenance_charges(id)
);

-- CREATE EXCEL IMPORT BATCH TABLE
CREATE TABLE maintenance_import_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_code VARCHAR(20) NOT NULL UNIQUE,

  society_id INT NOT NULL,
  admin_id INT NOT NULL,

  file_name VARCHAR(255) NOT NULL,
  total_rows INT NOT NULL DEFAULT 0,
  inserted_rows INT NOT NULL DEFAULT 0,
  updated_rows INT NOT NULL DEFAULT 0,
  failed_rows INT NOT NULL DEFAULT 0,
  status ENUM('processing','completed','completed_with_errors','failed')
    DEFAULT 'processing',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_import_society (society_id),
  INDEX idx_import_admin (admin_id),
  INDEX idx_import_status (status),

  CONSTRAINT fk_import_society
    FOREIGN KEY (society_id)
    REFERENCES societies(id),

  CONSTRAINT fk_import_admin
    FOREIGN KEY (admin_id)
    REFERENCES admins(id)
);

-- CREATE EXCEL IMPORT ROW LOG TABLE
CREATE TABLE maintenance_import_errors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_id INT NOT NULL,
  row_no INT NOT NULL,
  status ENUM('success','failed') NOT NULL,
  error_message TEXT NULL,
  raw_data JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_import_error_batch (batch_id),
  INDEX idx_import_error_status (status),

  CONSTRAINT fk_import_error_batch
    FOREIGN KEY (batch_id)
    REFERENCES maintenance_import_batches(id)
);

-- CREATE MAINTENANCE AUDIT LOG TABLE
CREATE TABLE maintenance_audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  society_id INT NOT NULL,
  admin_id INT NOT NULL,

  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT NULL,
  before_data JSON NULL,
  after_data JSON NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_maintenance_audit_society (society_id, created_at),
  INDEX idx_maintenance_audit_admin (admin_id),
  INDEX idx_maintenance_audit_entity (entity_type, entity_id),

  CONSTRAINT fk_maintenance_audit_society
    FOREIGN KEY (society_id)
    REFERENCES societies(id),

  CONSTRAINT fk_maintenance_audit_admin
    FOREIGN KEY (admin_id)
    REFERENCES admins(id)
);



