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
},


// NEW METHOD: Get the age distribution of patients, including tumor cases
getAgeDistribution: (doctorId) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT 
        CASE 
          WHEN date_of_birth IS NULL THEN 'Unknown'
          WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) <= 10 THEN '0-10'
          WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) <= 20 THEN '11-20'
          WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) <= 30 THEN '21-30'
          WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) <= 40 THEN '31-40'
          WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) <= 50 THEN '41-50'
          WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) <= 60 THEN '51-60'
          WHEN TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) <= 70 THEN '61-70'
          ELSE '71+'
        END AS age_group,
        COUNT(DISTINCT p.patient_id) AS total_patients,
        COUNT(DISTINCT CASE WHEN s.cancer_detected = TRUE THEN p.patient_id END) AS patients_with_tumor
      FROM 
        patients p
      LEFT JOIN 
        scans s ON p.patient_id = s.patient_id
      WHERE 
        p.doctor_id = ?
      GROUP BY 
        age_group
      ORDER BY 
        FIELD(age_group, '0-10', '11-20', '21-30', '31-40', '41-50', '51-60', '61-70', '71+', 'Unknown')`,
      [doctorId],
      (error, results) => {
        if (error) {
          console.error('Error getting patient age distribution:', error);
          return reject(error);
        }
        
        // Process the results into the format needed for the chart
        // Only include age groups that have data
        const labels = [];
        const allPatients = [];
        const patientsWithTumor = [];
        
        // Fill in actual values
        results.forEach(row => {
          if (row.total_patients > 0) { // Only include groups with patients
            labels.push(row.age_group);
            allPatients.push(row.total_patients);
            patientsWithTumor.push(row.patients_with_tumor || 0);
          }
        });
        
        // If no data found, return empty arrays
        if (labels.length === 0) {
          return resolve({
            labels: [],
            allPatients: [],
            patientsWithTumor: []
          });
        }
        
        return resolve({
          labels: labels,
          allPatients: allPatients,
          patientsWithTumor: patientsWithTumor
        });
      }
    );
  });
}
};

module.exports = Patient;