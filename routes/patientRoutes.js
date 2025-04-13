const express = require('express');
const router = express.Router();
const PatientController = require('../controllers/patientController');
const { ensureAuthenticated } = require('../utils/auth');

// Apply authentication middleware to all patient routes
router.use(ensureAuthenticated);

// ========== RENDER ROUTES ==========

// Get all patients page (list view)
router.get('/', PatientController.getAllPatientsPage);

// Get add patient page
router.get('/add', PatientController.getAddPatientPage);
// Get patient details page
router.get('/:id', PatientController.getPatientDetailsPage);


// Get edit patient page
router.get('/:id/edit', PatientController.getEditPatientPage);

// ========== API/PROCESSING ROUTES ==========
// Create new patient
router.post('/add', PatientController.addPatient);

// Update existing patient
router.post('/:id/edit', PatientController.updatePatient);

// Delete patient
router.delete('/:id', PatientController.deletePatient);
// API: Search patients
router.get('/api/search', PatientController.searchPatients);

// API: Get all patients
router.get('/api/all', PatientController.getAllPatients);

// API: Get patient by ID
router.get('/api/:id', PatientController.getPatientById);



module.exports = router;