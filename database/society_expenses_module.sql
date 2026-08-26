-- Society Expenses and Financial Management Module
-- Execute once after the base Society Management schema is installed.
-- This migration is additive and does not drop existing objects.

CREATE TABLE IF NOT EXISTS expense_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_code VARCHAR(20) NOT NULL UNIQUE,
  society_id INT NOT NULL,
  admin_id INT NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_expense_category_society_name (society_id, category_name),
  INDEX idx_expense_category_society_status (society_id, status),

  CONSTRAINT fk_expense_category_society
    FOREIGN KEY (society_id) REFERENCES societies(id),
  CONSTRAINT fk_expense_category_admin
    FOREIGN KEY (admin_id) REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vendor_code VARCHAR(20) NOT NULL UNIQUE,
  society_id INT NOT NULL,
  admin_id INT NOT NULL,
  vendor_name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(100) NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(100) NULL,
  address VARCHAR(255) NULL,
  gst_number VARCHAR(30) NULL,
  notes VARCHAR(255) NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_vendor_society_status (society_id, status),
  INDEX idx_vendor_name (vendor_name),

  CONSTRAINT fk_vendor_society
    FOREIGN KEY (society_id) REFERENCES societies(id),
  CONSTRAINT fk_vendor_admin
    FOREIGN KEY (admin_id) REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS payment_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_code VARCHAR(20) NOT NULL UNIQUE,
  society_id INT NOT NULL,
  admin_id INT NOT NULL,
  account_name VARCHAR(120) NOT NULL,
  account_type ENUM('cash','bank') NOT NULL,
  bank_name VARCHAR(120) NULL,
  masked_account_number VARCHAR(40) NULL,
  opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  opening_balance_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_payment_account_society_name (society_id, account_name),
  INDEX idx_payment_account_society_type (society_id, account_type),
  INDEX idx_payment_account_status (society_id, status),

  CONSTRAINT fk_payment_account_society
    FOREIGN KEY (society_id) REFERENCES societies(id),
  CONSTRAINT fk_payment_account_admin
    FOREIGN KEY (admin_id) REFERENCES admins(id),
  CONSTRAINT chk_payment_account_opening
    CHECK (opening_balance >= 0)
);

CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  expense_number VARCHAR(30) NOT NULL UNIQUE,
  society_id INT NOT NULL,
  admin_id INT NOT NULL,
  updated_by_admin_id INT NULL,
  expense_date DATE NOT NULL,
  category_id INT NOT NULL,
  sub_category VARCHAR(100) NULL,
  vendor_id INT NULL,
  paid_to VARCHAR(150) NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  invoice_number VARCHAR(100) NULL,
  invoice_date DATE NULL,
  payment_mode ENUM('cash','cheque','bank_transfer','upi','online','card','adjustment','other') NOT NULL,
  payment_account_id INT NULL,
  reference_no VARCHAR(100) NULL,
  cheque_number VARCHAR(100) NULL,
  cheque_date DATE NULL,
  status ENUM('draft','pending','approved','paid','cancelled') NOT NULL DEFAULT 'pending',
  notes VARCHAR(255) NULL,
  cancellation_reason VARCHAR(255) NULL,
  cancelled_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_expense_society_date (society_id, expense_date),
  INDEX idx_expense_category (category_id),
  INDEX idx_expense_vendor (vendor_id),
  INDEX idx_expense_account (payment_account_id),
  INDEX idx_expense_status (society_id, status),
  INDEX idx_expense_payment_mode (society_id, payment_mode),

  CONSTRAINT fk_expense_society
    FOREIGN KEY (society_id) REFERENCES societies(id),
  CONSTRAINT fk_expense_admin
    FOREIGN KEY (admin_id) REFERENCES admins(id),
  CONSTRAINT fk_expense_updated_admin
    FOREIGN KEY (updated_by_admin_id) REFERENCES admins(id),
  CONSTRAINT fk_expense_category
    FOREIGN KEY (category_id) REFERENCES expense_categories(id),
  CONSTRAINT fk_expense_vendor
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
  CONSTRAINT fk_expense_payment_account
    FOREIGN KEY (payment_account_id) REFERENCES payment_accounts(id),
  CONSTRAINT chk_expense_amount_positive
    CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS financial_transactions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  transaction_code VARCHAR(24) NOT NULL UNIQUE,
  society_id INT NOT NULL,
  admin_id INT NOT NULL,
  payment_account_id INT NOT NULL,
  transaction_date DATE NOT NULL,
  transaction_type ENUM('opening','income','expense','transfer','adjustment','reversal') NOT NULL,
  source_type ENUM('opening_balance','maintenance_payment','expense','expense_cancellation','manual_adjustment') NOT NULL,
  source_id BIGINT NULL,
  reference_no VARCHAR(100) NULL,
  description VARCHAR(255) NOT NULL,
  debit_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  credit_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status ENUM('posted','void') NOT NULL DEFAULT 'posted',
  reversed_by_transaction_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_finance_source_once (society_id, source_type, source_id),
  INDEX idx_finance_society_date (society_id, transaction_date, id),
  INDEX idx_finance_account_date (payment_account_id, transaction_date, id),
  INDEX idx_finance_type (society_id, transaction_type),
  INDEX idx_finance_source (source_type, source_id),

  CONSTRAINT fk_finance_society
    FOREIGN KEY (society_id) REFERENCES societies(id),
  CONSTRAINT fk_finance_admin
    FOREIGN KEY (admin_id) REFERENCES admins(id),
  CONSTRAINT fk_finance_payment_account
    FOREIGN KEY (payment_account_id) REFERENCES payment_accounts(id),
  CONSTRAINT fk_finance_reversal
    FOREIGN KEY (reversed_by_transaction_id) REFERENCES financial_transactions(id),
  CONSTRAINT chk_finance_one_sided_amount
    CHECK (
      (debit_amount >= 0 AND credit_amount >= 0)
      AND NOT (debit_amount > 0 AND credit_amount > 0)
    )
);

CREATE TABLE IF NOT EXISTS expense_audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  society_id INT NOT NULL,
  admin_id INT NOT NULL,
  expense_id INT NULL,
  action VARCHAR(50) NOT NULL,
  before_data JSON NULL,
  after_data JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_expense_audit_society (society_id, created_at),
  INDEX idx_expense_audit_expense (expense_id),

  CONSTRAINT fk_expense_audit_society
    FOREIGN KEY (society_id) REFERENCES societies(id),
  CONSTRAINT fk_expense_audit_admin
    FOREIGN KEY (admin_id) REFERENCES admins(id),
  CONSTRAINT fk_expense_audit_expense
    FOREIGN KEY (expense_id) REFERENCES expenses(id)
);

-- Seed default categories for every active society that already has an admin.
INSERT IGNORE INTO expense_categories
  (category_code, society_id, admin_id, category_name, description)
SELECT CONCAT('ECAT-', LEFT(REPLACE(UUID(), '-', ''), 10)), a.society_id, MIN(a.id), seed.category_name, seed.description
FROM admins a
JOIN (
  SELECT 'Security' AS category_name, 'Security guards and agency expenses' AS description UNION ALL
  SELECT 'Watchman', 'Watchman salary or services' UNION ALL
  SELECT 'Cleaning', 'Housekeeping and cleaning expenses' UNION ALL
  SELECT 'Electricity', 'Common-area electricity bills' UNION ALL
  SELECT 'Water', 'Water supply and tanker expenses' UNION ALL
  SELECT 'Lift Maintenance', 'Lift repairs, service and AMC' UNION ALL
  SELECT 'Repairs & Maintenance', 'General society repair work' UNION ALL
  SELECT 'Plumbing', 'Plumbing materials and services' UNION ALL
  SELECT 'Electrical', 'Electrical materials and services' UNION ALL
  SELECT 'Gardening', 'Garden and landscape expenses' UNION ALL
  SELECT 'AMC', 'Annual maintenance contracts' UNION ALL
  SELECT 'Stationery', 'Office stationery expenses' UNION ALL
  SELECT 'Printing & Xerox', 'Printing and photocopy expenses' UNION ALL
  SELECT 'AGM Expenses', 'Annual general meeting expenses' UNION ALL
  SELECT 'Legal', 'Legal and professional fees' UNION ALL
  SELECT 'Bank Charges', 'Bank fees and charges' UNION ALL
  SELECT 'Insurance', 'Insurance premium expenses' UNION ALL
  SELECT 'Government Charges', 'Government fees and statutory charges' UNION ALL
  SELECT 'Miscellaneous', 'Other society expenses'
) seed
GROUP BY a.society_id, seed.category_name, seed.description;

-- Seed default account placeholders for every active society.
INSERT IGNORE INTO payment_accounts
  (account_code, society_id, admin_id, account_name, account_type, opening_balance, opening_balance_date)
SELECT CONCAT('ACC-', LEFT(REPLACE(UUID(), '-', ''), 10)), a.society_id, MIN(a.id),
       'Society Cash', 'cash', 0.00, CURRENT_DATE
FROM admins a
GROUP BY a.society_id;

INSERT IGNORE INTO payment_accounts
  (account_code, society_id, admin_id, account_name, account_type, bank_name, opening_balance, opening_balance_date)
SELECT CONCAT('ACC-', LEFT(REPLACE(UUID(), '-', ''), 10)), a.society_id, MIN(a.id),
       'Primary Bank Account', 'bank', 'Bank', 0.00, CURRENT_DATE
FROM admins a
GROUP BY a.society_id;

-- Opening rows are zero-value markers; opening balance is stored on payment_accounts.
INSERT IGNORE INTO financial_transactions
  (transaction_code, society_id, admin_id, payment_account_id, transaction_date,
   transaction_type, source_type, source_id, description, debit_amount, credit_amount)
SELECT CONCAT('FTX-', LEFT(REPLACE(UUID(), '-', ''), 10)), pa.society_id, pa.admin_id,
       pa.id, pa.opening_balance_date, 'opening', 'opening_balance', pa.id,
       CONCAT('Opening balance for ', pa.account_name), 0.00, 0.00
FROM payment_accounts pa;

-- Backfill existing maintenance payments as income credits exactly once.
INSERT IGNORE INTO financial_transactions
  (transaction_code, society_id, admin_id, payment_account_id, transaction_date,
   transaction_type, source_type, source_id, reference_no, description, debit_amount, credit_amount)
SELECT CONCAT('FTX-', LEFT(REPLACE(UUID(), '-', ''), 10)),
       mp.society_id,
       mp.admin_id,
       pa.id,
       mp.payment_date,
       'income',
       'maintenance_payment',
       mp.id,
       COALESCE(mp.reference_no, mp.receipt_number),
       CONCAT('Maintenance receipt ', mp.receipt_number),
       0.00,
       mp.amount
FROM maintenance_payments mp
JOIN payment_accounts pa
  ON pa.society_id = mp.society_id
 AND pa.account_name = CASE
   WHEN mp.payment_mode = 'cash' THEN 'Society Cash'
   ELSE 'Primary Bank Account'
 END;
