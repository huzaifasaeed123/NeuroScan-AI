
const connection = require('../models/db.js'); // import our pool from db.js

// DDL statements for your tables
// (Use the schema we discussed or adapt as needed)

// Example: Doctors Table
const createDoctorsTable = `
  CREATE TABLE IF NOT EXISTS doctors (
    doctor_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    specialization VARCHAR(100),
    hospital_affiliation VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`;

// Example: Patients Table
const createPatientsTable = `
  -- Patients Table
CREATE TABLE IF NOT EXISTS patients (
  patient_id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  patient_unique_id VARCHAR(20) NOT NULL,
  date_of_birth DATE,
  email VARCHAR(100),
  contact_number VARCHAR(20),
  gender VARCHAR(10),
  patient_history TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE CASCADE
);
`;

// Example: Scans Table
const createScansTable = `
  CREATE TABLE IF NOT EXISTS scans (
    scan_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    image_file_path VARCHAR(255) NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scan_type VARCHAR(50),
    description TEXT,
    status VARCHAR(50),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
  )
`;

// Example: Results Table
const createResultsTable = `
  CREATE TABLE IF NOT EXISTS results (
    result_id INT AUTO_INCREMENT PRIMARY KEY,
    scan_id INT NOT NULL,
    cancer_detected BOOLEAN NOT NULL,
    cancer_type VARCHAR(50),
    confidence_score DECIMAL(5,2),
    additional_info JSON,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scan_id) REFERENCES scans(scan_id) ON DELETE CASCADE
  )
`;

async function initDB() {
  try {
    // Create each table in sequence (or parallel if you prefer, but sequence is simpler)
     connection.query(createDoctorsTable);
     connection.query(createPatientsTable);
     connection.query(createScansTable);
     connection.query(createResultsTable);

    console.log('All tables created (if they did not exist).');
    // Close the pool so the script can exit
    connection.end();
  } catch (error) {
    console.error('Error creating tables:', error);
    connection.end();
  }
}

// Call init function
initDB();
