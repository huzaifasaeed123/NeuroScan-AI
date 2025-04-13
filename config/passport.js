const LocalStrategy = require('passport-local').Strategy;
const Doctor = require('../models/doctorModel');

module.exports = function(passport) {
  // Configure passport to use local strategy
  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          // Find user by email
          const doctor = await Doctor.findByEmail(email);
          
          // If doctor doesn't exist
          if (!doctor) {
            return done(null, false, { message: 'No account with that email exists' });
          }

          // Check password
          const isMatch = await Doctor.validatePassword(password, doctor.password_hash);
          
          if (!isMatch) {
            return done(null, false, { message: 'Incorrect password' });
          }

          // If all checks pass, return the doctor object
          return done(null, doctor);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialize doctor for the session
  passport.serializeUser((doctor, done) => {
    done(null, doctor.doctor_id);
  });

  // Deserialize doctor from the session
  passport.deserializeUser(async (id, done) => {
    try {
      const doctor = await Doctor.findById(id);
      done(null, doctor);
    } catch (error) {
      done(error);
    }
  });
};