-- CREATE ADMIN TABLE MYSQL MODEL
CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,

  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(15),

  role ENUM('super_admin','admin') DEFAULT 'admin',
  status ENUM('active','inactive') DEFAULT 'active',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CREATE FLATS TABLE MYSQL MODEL
CREATE TABLE flats (
  id INT AUTO_INCREMENT PRIMARY KEY,

  wing VARCHAR(10) NOT NULL,
  floor_no INT NOT NULL,
  flat_no VARCHAR(10) NOT NULL,
  area INT,

  owner_name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  whatsapp VARCHAR(15),
  email VARCHAR(100),

  maintenance_amount DECIMAL(10,2) NOT NULL,
  occupancy ENUM('owner','tenant') DEFAULT 'owner',

  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (wing, flat_no)
);

-- CREATE TENANTS TABLE MYSQL MODEL
CREATE TABLE tenants (
  id INT AUTO_INCREMENT PRIMARY KEY,

  flat_id INT NOT NULL,

  tenant_name VARCHAR(100) NOT NULL,
  tenant_phone VARCHAR(15) NOT NULL,
  tenant_whatsapp VARCHAR(15),
  tenant_email VARCHAR(100),

  move_in_date DATE NOT NULL,
  move_out_date DATE,

  exit_letter_submitted ENUM('yes','no') DEFAULT 'no',

  status ENUM('active','inactive') DEFAULT 'active',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (flat_id) REFERENCES flats(id)
);

-- CREATE MAINTENANCE SETTING TABLE MYSQL MODEL
CREATE TABLE maintenance_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,

  setting_key VARCHAR(50) UNIQUE NOT NULL,
  setting_value DECIMAL(10,2) NOT NULL,

  description VARCHAR(255),
  status ENUM('active','inactive') DEFAULT 'active',

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
);

