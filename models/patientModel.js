const connection = require('./db.js');

const Patient = {
  findAll: (doctorId) => {
    return new Promise((resolve, reject) => {
      connection.query(
        'SELECT * FROM patients WHERE doctor_id = ? ORDER BY created_at DESC',
        [doctorId],
        (error, results) => {
          if (error) {
            return reject(error);
          }
          return resolve(results);
        }
      );
    });
  },
  findById: (patientId, doctorId) => {
    return new Promise((resolve, reject) => {
      connection.query(
        'SELECT * FROM patients WHERE patient_id = ? AND doctor_id = ?',
        [patientId, doctorId],
        (error, results) => {
          if (error) {
            return reject(error);
          }
          return resolve(results[0]);
        }
      );
    });
  },

  findByUniqueId: (patientUniqueId, doctorId) => {
    return new Promise((resolve, reject) => {
      connection.query(
        'SELECT * FROM patients WHERE patient_unique_id = ? AND doctor_id = ?',
        [patientUniqueId, doctorId],
        (error, results) => {
          if (error) {
            return reject(error);
          }
          return resolve(results[0]);
        }
      );
    });
  },

  search: (searchTerm, doctorId) => {
    return new Promise((resolve, reject) => {
      const searchQuery = `%${searchTerm}%`;
      connection.query(
        'SELECT * FROM patients WHERE doctor_id = ? AND (full_name LIKE ? OR patient_unique_id LIKE ? OR email LIKE ? OR contact_number LIKE ?)',
        [doctorId, searchQuery, searchQuery, searchQuery, searchQuery],
        (error, results) => {
          if (error) {
            return reject(error);
          }
          return resolve(results);
        }
      );
    });
  },

  create: (patientData) => {
    return new Promise((resolve, reject) => {
      connection.query(
        'INSERT INTO patients (doctor_id, full_name, patient_unique_id, date_of_birth, gender, email, contact_number, patient_history) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          patientData.doctorId,
          patientData.fullName,
          patientData.patientUniqueId,
          patientData.dateOfBirth,
          patientData.gender,
          patientData.email || null,
          patientData.contactNumber || null,
          patientData.patientHistory || null
        ],
        (error, results) => {
          if (error) {
            return reject(error);
          }
          return resolve(results.insertId);
        }
      );
    });
  },

  update: (patientId, doctorId, patientData) => {
    return new Promise((resolve, reject) => {
      connection.query(
        'UPDATE patients SET full_name = ?, date_of_birth = ?, gender = ?, email = ?, contact_number = ?, patient_history = ? WHERE patient_id = ? AND doctor_id = ?',
        [
          patientData.fullName,
          patientData.dateOfBirth,
          patientData.gender,
          patientData.email || null,
          patientData.contactNumber || null,
          patientData.patientHistory || null,
          patientId,
          doctorId
        ],
        (error, results) => {
          if (error) {
            return reject(error);
          }
          return resolve(results.affectedRows > 0);
        }
      );
    });
  },

  delete: (patientId, doctorId) => {
    return new Promise((resolve, reject) => {
      connection.query(
        'DELETE FROM patients WHERE patient_id = ? AND doctor_id = ?',
        [patientId, doctorId],
        (error, results) => {
          if (error) {
            return reject(error);
          }
          return resolve(results.affectedRows > 0);
        }
      );
    });
  },
  
  getCount: (doctorId) => {
    return new Promise((resolve, reject) => {
      connection.query(
        'SELECT COUNT(*) as count FROM patients WHERE doctor_id = ?',
        [doctorId],
        (error, results) => {
          if (error) {
            return reject(error);
          }
          return resolve(results[0].count);
        }
      );
    });
  },
  
  getRecent: (doctorId, limit = 5) => {
    return new Promise((resolve, reject) => {
      connection.query(
        'SELECT * FROM patients WHERE doctor_id = ? ORDER BY created_at DESC LIMIT ?',
        [doctorId, limit],
        (error, results) => {
          if (error) {
            return reject(error);
          }
          return resolve(results);
        }
      );
    });
  },


  //Following Function are used By Dashboard


  // Get patient growth percentage
getPatientGrowthPercentage: (doctorId) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT 
        (SELECT COUNT(*) FROM patients
         WHERE doctor_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) as current_month,
        (SELECT COUNT(*) FROM patients
         WHERE doctor_id = ? AND created_at BETWEEN DATE_SUB(CURDATE(), INTERVAL 2 MONTH) AND DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) as previous_month`,
      [doctorId, doctorId],
      (error, results) => {
        if (error) {
          return reject(error);
        }
        
        const current = results[0].current_month;
        const previous = results[0].previous_month;
        
        if (previous === 0) {
          return resolve(100); // If no patients in previous month, consider it 100% growth
        }
        
        const growthPercentage = ((current - previous) / previous) * 100;
        return resolve(Math.round(growthPercentage));
      }
    );
  });
},

// Get recent patients with scan status
getRecentWithStatus: (doctorId, limit = 5) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT 
        p.patient_id as id,
        p.full_name as firstName,
        '' as lastName,
        TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) as age,
        p.email,
        p.patient_unique_id as patientUniqueId,
        (SELECT MAX(s.upload_date) FROM scans s WHERE s.patient_id = p.patient_id) as lastScanDate,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM scans s 
            WHERE s.patient_id = p.patient_id 
            AND s.cancer_detected = true
            AND s.upload_date = (SELECT MAX(upload_date) FROM scans WHERE patient_id = p.patient_id)
          ) THEN 'urgent'
          WHEN EXISTS (
            SELECT 1 FROM scans s 
            WHERE s.patient_id = p.patient_id 
            AND s.status = 'pending'
            AND s.upload_date = (SELECT MAX(upload_date) FROM scans WHERE patient_id = p.patient_id)
          ) THEN 'pending'
          ELSE 'normal'
        END as status
      FROM patients p
      WHERE p.doctor_id = ?
      ORDER BY p.created_at DESC
      LIMIT ?`,
      [doctorId, limit],
      (error, results) => {
        if (error) {
          return reject(error);
        }
        
        // Format the results
        const patients = results.map(patient => {
          // Split full name into first and last name
          const nameParts = patient.firstName.split(' ');
          if (nameParts.length > 1) {
            patient.lastName = nameParts.pop();
            patient.firstName = nameParts.join(' ');
          } else {
            patient.lastName = '';
          }
          
          // Format dates
          if (patient.lastScanDate) {
            patient.lastScanDate = new Date(patient.lastScanDate);
          }
          
          return patient;
        });
        
        return resolve(patients);
      }
    );
  });
}
};

module.exports = Patient;