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
