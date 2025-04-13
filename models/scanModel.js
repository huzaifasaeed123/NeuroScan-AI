// models/scanModel.js
const connection = require('./db.js');

const Scan = {
  findByPatientId: (patientId) => {
    return new Promise((resolve, reject) => {
      connection.query(
        'SELECT * FROM scans WHERE patient_id = ? ORDER BY upload_date DESC',
        [patientId],
        (error, results) => {
          if (error) {
            return reject(error);
          }
          return resolve(results);
        }
      );
    });
  },

  findById: (scanId) => {
    return new Promise((resolve, reject) => {
      connection.query(
        'SELECT * FROM scans WHERE scan_id = ?',
        [scanId],
        (error, results) => {
          if (error) {
            return reject(error);
          }
          return resolve(results[0]);
        }
      );
    });
  },

  create: (scanData) => {
    return new Promise((resolve, reject) => {
      connection.query(
          `INSERT INTO scans (
            patient_id,
            image_file_path,
            upload_date,
            scan_type,
            description,
            status,
            segmented_image_path,
            cancer_detected,
            cancer_type,
            glioma_probability,
            meningioma_probability,
            pituitary_probability,
            no_tumor_probability
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            scanData.patientId,
            scanData.imageFilePath,
            scanData.uploadDate || new Date(),
            scanData.scanType || 'MRI',
            scanData.description || '',
            scanData.status || 'pending',
            scanData.segmentedImagePath || '',
            scanData.cancerDetected || false,
            scanData.cancerType || '',
            scanData.gliomaProbability || 0,
            scanData.meningiomaProbability || 0,
            scanData.pituitaryProbability || 0,
            scanData.noTumorProbability || 0
          ],
        (error, results) => {
          if (error) {
            console.error('Database error when creating scan:', error);
            return reject(error);
          }
          return resolve(results.insertId);
        }
      );
    });
  },

  updateDoctorsNotes: (scanId, doctorsNotes) => {
    return new Promise((resolve, reject) => {
      connection.query(
        'UPDATE scans SET doctor_Note = ? WHERE scan_id = ?',
        [doctorsNotes, scanId],
        (error, results) => {
          if (error) {
            return reject(error);
          }
          return resolve(results.affectedRows > 0);
        }
      );
    });
  },

  // Add this to your scanModel.js
deleteById: (scanId, doctorId) => {
  return new Promise((resolve, reject) => {
    // First check if the scan exists and belongs to the doctor
    connection.query(
      `SELECT s.scan_id FROM scans s 
       JOIN patients p ON s.patient_id = p.patient_id 
       WHERE s.scan_id = ? AND p.doctor_id = ?`,
      [scanId, doctorId],
      (error, results) => {
        if (error) {
          return reject(error);
        }
        
        if (results.length === 0) {
          return resolve(false); // Scan not found or doesn't belong to this doctor
        }
        
        // Now delete the scan
        connection.query(
          'DELETE FROM scans WHERE scan_id = ?',
          [scanId],
          (error, results) => {
            if (error) {
              return reject(error);
            }
            return resolve(results.affectedRows > 0);
          }
        );
      }
    );
  });
},
  
  findByIdWithPatient: (scanId) => {
    return new Promise((resolve, reject) => {
      connection.query(
        `SELECT s.*, p.full_name, p.date_of_birth, p.gender, p.doctor_id 
         FROM scans s 
         JOIN patients p ON s.patient_id = p.patient_id 
         WHERE s.scan_id = ?`,
        [scanId],
        (error, results) => {
          if (error) {
            return reject(error);
          }
          
          if (results.length === 0) {
            return resolve(null);
          }
          
          // Format the result
          const scan = results[0];
          scan.patient = {
            full_name: scan.full_name,
            date_of_birth: scan.date_of_birth,
            gender: scan.gender,
            doctor_id: scan.doctor_id
          };
          
          // Remove the duplicated fields
          delete scan.full_name;
          delete scan.date_of_birth;
          delete scan.gender;
          
          return resolve(scan);
        }
      );
    });
  },

//Following Function are used By DAshboard
getCount: (doctorId) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT COUNT(*) as count FROM scans s 
       JOIN patients p ON s.patient_id = p.patient_id 
       WHERE p.doctor_id = ?`,
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

// Get count of positive findings (scans with cancer_detected = true)
getPositiveCount: (doctorId) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT COUNT(*) as count FROM scans s 
       JOIN patients p ON s.patient_id = p.patient_id 
       WHERE p.doctor_id = ? AND s.cancer_detected = true`,
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

// Get count of pending scans
getPendingCount: (doctorId) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT COUNT(*) as count FROM scans s 
       JOIN patients p ON s.patient_id = p.patient_id 
       WHERE p.doctor_id = ? AND s.status = 'pending'`,
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

// Get count of urgent pending cases
getUrgentPendingCount: (doctorId) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT COUNT(*) as count FROM scans s 
       JOIN patients p ON s.patient_id = p.patient_id 
       WHERE p.doctor_id = ? AND s.status = 'pending' 
       AND (s.glioma_probability > 0.7 OR s.meningioma_probability > 0.7 OR s.pituitary_probability > 0.7)`,
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

// Get monthly scan counts for the last 6 months
getMonthlyCounts: (doctorId) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT 
         DATE_FORMAT(s.upload_date, '%Y-%m') as month,
         COUNT(*) as total_scans,
         SUM(CASE WHEN s.cancer_detected = true THEN 1 ELSE 0 END) as positive_findings
       FROM scans s
       JOIN patients p ON s.patient_id = p.patient_id
       WHERE p.doctor_id = ? 
       AND s.upload_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(s.upload_date, '%Y-%m')
       ORDER BY month ASC`,
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

// Get scan counts by cancer type
getScansByType: (doctorId) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT 
         CASE 
           WHEN cancer_type = '' OR cancer_type IS NULL THEN 'No Tumor'
           ELSE cancer_type 
         END as type,
         COUNT(*) as count
       FROM scans s
       JOIN patients p ON s.patient_id = p.patient_id
       WHERE p.doctor_id = ?
       GROUP BY type`,
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

// Get recent scans with patient information
getRecentWithPatientInfo: (doctorId, limit = 5) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT s.scan_id as id, s.upload_date as date, s.scan_type as type, 
        CASE 
          WHEN s.cancer_detected = true THEN 'positive'
          WHEN s.status = 'pending' THEN 'pending'
          ELSE 'normal'
        END as result,
        p.patient_id as patientId, p.full_name as patientName
      FROM scans s
      JOIN patients p ON s.patient_id = p.patient_id
      WHERE p.doctor_id = ?
      ORDER BY s.upload_date DESC
      LIMIT ?`,
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

// Get scan growth percentage
getScanGrowthPercentage: (doctorId) => {
  return new Promise((resolve, reject) => {
    connection.query(
      `SELECT 
        (SELECT COUNT(*) FROM scans s
         JOIN patients p ON s.patient_id = p.patient_id
         WHERE p.doctor_id = ? AND s.upload_date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) as current_month,
        (SELECT COUNT(*) FROM scans s
         JOIN patients p ON s.patient_id = p.patient_id
         WHERE p.doctor_id = ? AND s.upload_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 2 MONTH) AND DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) as previous_month`,
      [doctorId, doctorId],
      (error, results) => {
        if (error) {
          return reject(error);
        }
        
        const current = results[0].current_month;
        const previous = results[0].previous_month;
        
        if (previous === 0) {
          return resolve(100); // If no scans in previous month, consider it 100% growth
        }
        
        const growthPercentage = ((current - previous) / previous) * 100;
        return resolve(Math.round(growthPercentage));
      }
    );
  });
}

};

module.exports = Scan;