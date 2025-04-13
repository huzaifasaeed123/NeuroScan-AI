const connection = require('./db.js');
const bcrypt = require('bcryptjs');

const Doctor = {
  findByEmail: (email) => {
    return new Promise((resolve, reject) => {
      connection.query(
        'SELECT * FROM doctors WHERE email = ?',
        [email],
        (error, results) => {
          if (error) {
            return reject(error);
          }
          return resolve(results[0]);
        }
      );
    });
  },

  findById: (id) => {
    return new Promise((resolve, reject) => {
      connection.query(
        'SELECT * FROM doctors WHERE doctor_id = ?',
        [id],
        (error, results) => {
          if (error) {
            return reject(error);
          }
          return resolve(results[0]);
        }
      );
    });
  },

  create: (doctorData) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(doctorData.password, salt);

        // Insert doctor data with hashed password
        connection.query(
          'INSERT INTO doctors (first_name, last_name, email, password_hash, phone_number, specialization, hospital_affiliation) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            doctorData.firstName,
            doctorData.lastName,
            doctorData.email,
            hashedPassword,
            doctorData.phoneNumber || null,
            doctorData.specialization || null,
            doctorData.hospitalAffiliation || null
          ],
          (error, results) => {
            if (error) {
              return reject(error);
            }
            return resolve(results.insertId);
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  },
  
  // Method to validate password
  validatePassword: async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
  },

  updateProfile: (doctorId, profileData) => {
    return new Promise((resolve, reject) => {
      connection.query(
        'UPDATE doctors SET first_name = ?, last_name = ?, email = ?, phone_number = ?, specialization = ?, hospital_affiliation = ? WHERE doctor_id = ?',
        [
          profileData.firstName,
          profileData.lastName,
          profileData.email,
          profileData.phoneNumber || null,
          profileData.specialization || null,
          profileData.hospitalAffiliation || null,
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
  
  // Update doctor password
  updatePassword: (doctorId, hashedPassword) => {
    return new Promise((resolve, reject) => {
      connection.query(
        'UPDATE doctors SET password_hash = ? WHERE doctor_id = ?',
        [hashedPassword, doctorId],
        (error, results) => {
          if (error) {
            return reject(error);
          }
          return resolve(results.affectedRows > 0);
        }
      );
    });
  }
};

module.exports = Doctor;