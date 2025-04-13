const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { ensureAuthenticated } = require('../utils/auth');

// Apply authentication middleware to all patient routes
router.use(ensureAuthenticated);




// Dashboard home route
router.get('/', dashboardController.getDashboard);

module.exports = router;

