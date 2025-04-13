const passport = require('passport');
const Doctor = require('../models/doctorModel');
const bcrypt = require('bcryptjs');
const AuthController = {
  // Render login page
  getLogin: (req, res) => {
    res.render('auth', {
      title: 'Login',
      layout: false, // Disable layout
      activeTab: 'login',
      messages: req.flash()
    });
  },

  // Render signup page
  getSignup: (req, res) => {
    res.render('auth', {
      title: 'Sign Up',
      layout: false, // Disable layout
      activeTab: 'signup',
      messages: req.flash()
    });
  },

  // Process login
  // postLogin: (req, res, next) => {
  //   passport.authenticate('local', {
  //     successRedirect: '/dashboard',
  //     failureRedirect: '/auth/login',
  //     failureFlash: true
  //   })(req, res, next);
  // },
postLogin: (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) return next(err);
      
      if (!user) {
        req.flash('error_msg', info.message || 'Invalid credentials');
        return res.redirect('/auth/login');
      }
      
      req.logIn(user, (err) => {
        if (err) return next(err);
        req.flash('success_msg', 'Signed successfully');
        // Debug: check authentication state
        // Store user information in session
        req.session.userId = user.doctor_id;
        req.session.first_name   = user.first_name;
        req.session.last_name = user.last_name;
        req.session.userEmail = user.email;
        req.session.specialization = user.specialization || 'doctor';
        console.log('User authenticated:', req.isAuthenticated());
        
        return res.redirect('/dashboard');
      });
    })(req, res, next);
  },
  // Process signup
  postSignup: async (req, res) => {
    try {
      const { firstName, lastName, email, password, confirmPassword, phoneNumber, specialization, hospitalAffiliation, agreeTerms } = req.body;
      
      // Basic validation
      const errors = [];
      
      if (!firstName || !lastName || !email || !password || !confirmPassword) {
        errors.push({ msg: 'Please fill in all required fields' });
      }
      
      if (password !== confirmPassword) {
        errors.push({ msg: 'Passwords do not match' });
      }
      
      if (password.length < 8) {
        errors.push({ msg: 'Password should be at least 8 characters' });
      }
      
      if (!agreeTerms) {
        errors.push({ msg: 'You must agree to the Terms of Service and Privacy Policy' });
      }
      
      // Check if email already exists
      const existingDoctor = await Doctor.findByEmail(email);
      if (existingDoctor) {
        errors.push({ msg: 'Email is already registered' });
      }
      
      if (errors.length > 0) {
        req.flash('success_msg', errors.msg);
        return res.redirect('signup');
      }
      
      // Create new doctor
      await Doctor.create({
        firstName,
        lastName,
        email,
        password,
        phoneNumber,
        specialization,
        hospitalAffiliation
      });
      
      req.flash('success_msg', 'You are now registered and can log in');
    //   console.log("Flash messages:", req.flash()); // Should show your message
      res.redirect('/auth/login');
    } catch (error) {
      console.error('Signup error:', error);
      req.flash('error_msg', 'An error occurred during registration');
      res.redirect('/auth/signup');
    }
  },

  // Logout
  logout: (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return next(err);
      }
      req.flash('success_msg', 'You are logged out');
      res.redirect('/auth/login');
    });
  },

  getUserProfile: async (req, res) => {
    try {
      res.render('user_profile', {
        title: 'User Profile',
        activeTab: 'profile',   
        user1: req.user,
        // messages: req.flash()
      });
    } catch (error) {
      console.error('Error loading profile page:', error);
      req.flash('error_msg', 'Error loading profile page');
      res.redirect('/dashboard');
    }
  },

  // Update user information
  updateProfile: async (req, res) => {
    try {
      const { firstName, lastName, email, phoneNumber, specialization, hospitalAffiliation } = req.body;
      
      // Validate required fields
      if (!firstName || !lastName || !email) {
        req.flash('error_msg', 'First name, last name, and email are required');
        return res.redirect('/auth/profile');
      }
      
      // Check if the email is changed and already exists
      if (email !== req.user.email) {
        const existingDoctor = await Doctor.findByEmail(email);
        if (existingDoctor && existingDoctor.doctor_id !== req.user.doctor_id) {
          req.flash('error_msg', 'Email is already in use by another account');
          return res.redirect('/auth/profile');
        }
      }
      
      // Update the profile
      const profileData = {
        firstName,
        lastName,
        email,
        phoneNumber,
        specialization,
        hospitalAffiliation
      };
      
      const updated = await Doctor.updateProfile(req.user.doctor_id, profileData);
      
      if (updated) {
        // Update the session user data
        req.user.first_name = firstName;
        req.user.last_name = lastName;
        req.user.email = email;
        req.user.phone_number = phoneNumber;
        req.user.specialization = specialization;
        req.user.hospital_affiliation = hospitalAffiliation;
        
        req.flash('success_msg', 'Profile Updated Successfully');
      } else {
        req.flash('error_msg', 'Failed to update profile');
      }
      
      res.redirect('/auth/profile');
    } catch (error) {
      console.error('Error updating profile:', error);
      req.flash('error_msg', 'An error occurred while updating your profile');
      res.redirect('/auth/profile');
    }
  },
  
  // Change password
  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      
      // Validate password fields
      if (!currentPassword || !newPassword || !confirmPassword) {
        req.flash('error_msg', 'All password fields are required');
        return res.redirect('/auth/profile');
      }
      
      if (newPassword !== confirmPassword) {
        req.flash('error_msg', 'New passwords do not match');
        return res.redirect('/auth/profile');
      }
      
      if (newPassword.length < 8) {
        req.flash('error_msg', 'Password must be at least 8 characters long');
        return res.redirect('/auth/profile');
      }
      
      // Verify current password
      const doctor = await Doctor.findById(req.user.doctor_id);
      if (!doctor) {
        req.flash('error_msg', 'User not found');
        return res.redirect('/auth/profile');
      }
      
      const isPasswordValid = await bcrypt.compare(currentPassword, doctor.password_hash);
      if (!isPasswordValid) {
        req.flash('error_msg', 'Current password is incorrect');
        return res.redirect('/auth/profile');
      }
      
      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      // Update password
      const updated = await Doctor.updatePassword(req.user.doctor_id, hashedPassword);
      
      if (updated) {
        req.flash('success_msg', 'Password changed successfully');
      } else {
        req.flash('error_msg', 'Failed to change password');
      }
      
      res.redirect('/auth/profile');
    } catch (error) {
      console.error('Error changing password:', error);
      req.flash('error_msg', 'An error occurred while changing your password');
      res.redirect('/auth/profile');
    }
  }

};

module.exports = AuthController;