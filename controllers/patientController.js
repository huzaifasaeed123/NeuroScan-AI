const Patient = require('../models/patientModel');
const Scan = require('../models/scanModel');
const PatientController = {
  // ========== VIEW/RENDER ROUTES ==========
  
  // Render patients list page
  getAllPatientsPage: async (req, res) => {
    try {
      const patients = await Patient.findAll(req.user.doctor_id);
      // console.log("inside All patient Details page",req.flash())
      res.render('all_patients', {
        title: 'All Patients',
        activeTab: 'patients',
        patients: patients,
      });
    } catch (error) {
      console.error('Error getting patients:', error);
      req.flash('error_msg', 'Error retrieving patients');
      res.redirect('/dashboard');
    }
  },

  // Render add new patient page
  getAddPatientPage: (req, res) => {
    res.render('add-patient', {
      title: 'Add New Patient',
      activeTab: 'add-patient',

    });
  },
  
  // Render patient details page
  getPatientDetailsPage: async (req, res) => {
    try {
      const patientId = req.params.id;
      console.log("PatientId", patientId);
      const patient = await Patient.findById(patientId, req.user.doctor_id);
      
      if (!patient) {
        req.flash('error_msg', 'Patient not found');
        return res.redirect('/patients');
      }
      
      // Get all scans for this patient
      const scans = await Scan.findByPatientId(patientId);
      
      // Calculate scan statistics
      const scanStats = {
        totalScans: scans.length,
        positiveScans: scans.filter(scan => scan.cancer_detected).length,
        negativeScans: scans.filter(scan => !scan.cancer_detected).length,
        firstScanDate: scans.length > 0 ? new Date(Math.min(...scans.map(s => new Date(s.upload_date)))) : null,
        latestScanDate: scans.length > 0 ? new Date(Math.max(...scans.map(s => new Date(s.upload_date)))) : null
      };
      
      console.log("inside patient Details page");
      res.render('view_patients', {
        title: `Patient: ${patient.full_name}`,
        patient: patient,
        scans: scans,
        scanStats: scanStats,
        activeTab: 'patients',
      });
    } catch (error) {
      console.error('Error getting patient details:', error);
      req.flash('error_msg', 'Error retrieving patient details');
      res.redirect('/patients');
    }
  },
  
  // Render edit patient page
  getEditPatientPage: async (req, res) => {
    try {
      const patientId = req.params.id;
      const patient = await Patient.findById(patientId, req.user.doctor_id);
      
      if (!patient) {
        req.flash('error_msg', 'Patient not found');
        return res.redirect('/patients');
      }
      
      res.render('edit_patient', {
        title: `Edit Patient`,
        patient: patient,
        activeTab: 'patients', // Add this line
        // messages: req.flash()
      });
    } catch (error) {
      console.error('Error getting patient for edit:', error);
      req.flash('error_msg', 'Error retrieving patient data');
      res.redirect('/patients');
    }
  },

  // ========== API/PROCESSING ROUTES ==========
  
  // API: Get all patients
  getAllPatients: async (req, res) => {
    try {
      const patients = await Patient.findAll(req.user.doctor_id);
      res.json({
        success: true,
        data: patients
      });
    } catch (error) {
      console.error('Error getting patients:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving patients',
        error: error.message
      });
    }
  },
  
  // API: Get a single patient by ID
  getPatientById: async (req, res) => {
    try {
      const patientId = req.params.id;
      const patient = await Patient.findById(patientId, req.user.doctor_id);
      
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }
      
      res.json({
        success: true,
        data: patient
      });
    } catch (error) {
      console.error('Error getting patient:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving patient data',
        error: error.message
      });
    }
  },
  
  // API: Search patients
  searchPatients: async (req, res) => {
    try {
      const searchTerm = req.query.q;
      
      if (!searchTerm) {
        const patients = await Patient.findAll(req.user.doctor_id);
        return res.json({
          success: true,
          data: patients
        });
      }
      
      const results = await Patient.search(searchTerm, req.user.doctor_id);
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error searching patients:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching patients',
        error: error.message
      });
    }
  },

  // Process new patient creation
  addPatient: async (req, res) => {
    try {
      // Generate a unique patient ID if not provided
      const patientUniqueId = req.body.patientId || `NS-${Math.floor(10000 + Math.random() * 90000)}`;
      
      // Create new patient
      const patientData = {
        doctorId: req.user.doctor_id,
        fullName: req.body.fullName,
        patientUniqueId: patientUniqueId,
        dateOfBirth: req.body.dateOfBirth,
        gender: req.body.gender,
        email: req.body.email,
        contactNumber: req.body.contactNumber,
        patientHistory: req.body.patientHistory || null
      };

      const patientId = await Patient.create(patientData);

      req.flash('success_msg', 'Patient Added successfully');
      // console.log("Inside Add Patient",req.flash())
    //   if (req.accepts('json')) {
    //     return res.json({
    //       success: true,
    //       message: 'Patient added successfully',
    //       data: { patientId, patientUniqueId }
    //     });
    //   }
      res.redirect('/patients');
    } catch (error) {
      console.error('Error adding patient:', error);
    //   if (req.accepts('json')) {
    //     return res.status(500).json({
    //       success: false,
    //       message: 'Error adding patient',
    //       error: error.message
    //     });
    //   }
      req.flash('error_msg', 'Error adding patient: ' + error.message);
      res.redirect('/patients/add');
    }
  },
  
  // Update existing patient
  updatePatient: async (req, res) => {
    try {
      const patientId = req.params.id;
      
      // Check if patient exists and belongs to the logged-in doctor
      const existingPatient = await Patient.findById(patientId, req.user.doctor_id);
      
      if (!existingPatient) {
        if (req.accepts('json')) {
          return res.status(404).json({
            success: false,
            message: 'Patient not found or you do not have permission to modify this record'
          });
        }
        req.flash('error_msg', 'Patient not found or you do not have permission to modify this record');
        return res.redirect('/patients');
      }
      
      // Update patient data
      const patientData = {
        fullName: req.body.fullName,
        dateOfBirth: req.body.dateOfBirth,
        gender: req.body.gender,
        email: req.body.email,
        contactNumber: req.body.contactNumber,
        patientHistory: req.body.patientHistory
      };
      
      const success = await Patient.update(patientId, req.user.doctor_id, patientData);
      
      if (success) {
        // if (req.accepts('json')) {
        //   return res.json({
        //     success: true,
        //     message: 'Patient updated successfully'
        //   });
        // }
        req.flash('success_msg', 'Patient Updated successfully');
        console.log("Patient updated successfully")
        res.redirect(`/patients/${patientId}`);
      } else {
        // if (req.accepts('json')) {
        //   return res.status(400).json({
        //     success: false,
        //     message: 'No changes were made to the patient record'
        //   });
        // }
        req.flash('error_msg', 'No changes were made to the patient record');
        res.redirect(`/patients/${patientId}/edit`);
      }
    } catch (error) {
      console.error('Error updating patient:', error);
    //   if (req.accepts('json')) {
    //     return res.status(500).json({
    //       success: false,
    //       message: 'Error updating patient',
    //       error: error.message
    //     });
    //   }
      req.flash('error_msg', 'Error updating patient: ' + error.message);
      res.redirect(`/patients/${req.params.id}/edit`);
    }
  },
  
  // Delete a patient
  deletePatient: async (req, res) => {
    try {
      const patientId = req.params.id;
      
      // Check if patient exists and belongs to the logged-in doctor
      const existingPatient = await Patient.findById(patientId, req.user.doctor_id);
      
      if (!existingPatient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found or you do not have permission to delete this record'
        });
      }
      
      const success = await Patient.delete(patientId, req.user.doctor_id);
      req.flash('success_msg', 'Patient Deleted successfully');
      res.redirect("/patients")
    //   if (success) {
    //     return res.json({
    //       success: true,
    //       message: 'Patient deleted successfully'
    //     });
    //   } else {
    //     return res.status(500).json({
    //       success: false,
    //       message: 'Failed to delete patient'
    //     });
    //   }
    } catch (error) {
      console.error('Error deleting patient:', error);
    //   return res.status(500).json({
    //     success: false,
    //     message: 'Error deleting patient',
    //     error: error.message
    //   });
    }
  }
};

module.exports = PatientController;