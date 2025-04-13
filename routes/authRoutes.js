const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { forwardAuthenticated ,ensureAuthenticated} = require('../utils/auth');

// Login page - GET

router.get('/login', forwardAuthenticated, authController.getLogin);

// Signup page - GET
router.get('/signup', forwardAuthenticated, authController.getSignup);

// Login process - POST
router.post('/login', authController.postLogin);

// Signup process - POST
router.post('/signup', authController.postSignup);

// Logout - GET
router.post('/logout', authController.logout);

router.get("/profile",ensureAuthenticated, authController.getUserProfile)
// POST update profile
router.post('/update',ensureAuthenticated, authController.updateProfile);

// POST change password
router.post('/change-password',ensureAuthenticated, authController.changePassword);

module.exports = router;