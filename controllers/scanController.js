// controllers/scanController.js
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const Scan = require('../models/scanModel');
const Patient = require('../models/patientModel');

const ScanController = {
  // Render scan page with patient list
  getScanPage: async (req, res) => {
    try {
      // Get all patients for the logged-in doctor
      const patients = await Patient.findAll(req.user.doctor_id);
      
      // Get selected patient if available
      let selectedPatient = null;
      if (req.query.patientId) {
        selectedPatient = await Patient.findById(req.query.patientId, req.user.doctor_id);
      }
      
      res.render('scan_page', {
        title: 'Process New Scan',
        activeTab: 'process-scan',
        patients,
        selectedPatient,
        messages: req.flash()
      });
    } catch (error) {
      console.error('Error loading scan page:', error);
      req.flash('error_msg', 'Error loading scan page');
      res.redirect('/dashboard');
    }
  },
  
  // Process the scan and send to Python model
  processScan: async (req, res) => {
    try {
      const { patientId, scanDate } = req.body;
      const scanFile = req.file; // From multer
      
      if (!patientId || !scanDate || !scanFile) {
        req.flash('error_msg', 'Missing required fields');
        return res.redirect('/scans/process');
      }
      
      // Check if patient exists and belongs to the logged-in doctor
      const patient = await Patient.findById(patientId, req.user.doctor_id);
      if (!patient) {
        req.flash('error_msg', 'Patient not found');
        return res.redirect('/scans/process');
      }
      
      // Create directories if they don't exist
      const resultsDir = path.join(__dirname, '../public/uploads/results');
      
      
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }
             
      
    //   const scanId = await Scan.create(scanData);
      
      // Create form data for Python API
      const formData = new FormData();
      formData.append('scan_file', fs.createReadStream(scanFile.path));
      
      // Send to Python model server
      const modelServerUrl = process.env.MODEL_SERVER_URL || 'http://localhost:5000/process-file';
      
      try {
        // Send request to Python server
        const modelResponse = await axios.post(modelServerUrl, formData, {
          headers: {
            ...formData.getHeaders()
          },
          timeout: 60000 // 1 minute timeout
        });
        
        if (modelResponse.data.success) {
          // Get segmented image path from response
          segmentImagePath= modelResponse.data.segmented_image_path
          // Save segmented image locally
          const segmentedLocalPath = path.join(resultsDir,segmentImagePath);
          
         
            // Extract base64 data (remove data:image/png;base64, prefix)
        const segmentedBase64 = modelResponse.data.segmented_image_data.split(',')[1];
            
            // Save image locally
        fs.writeFileSync(segmentedLocalPath, Buffer.from(segmentedBase64, 'base64'));
          
          
          // Get cancer detection info and category probabilities
          const cancerDetected = modelResponse.data.cancer_detected;
          const cancerType = modelResponse.data.cancer_type;
          const probabilities = modelResponse.data.category_probabilities;
          // Update scan record with all data
          const scanData = {
            patientId: patientId,
            imageFilePath: '/uploads/scans/' + scanFile.filename,
            uploadDate: scanDate,
            scanType: 'MRI',
            description: 'Brain MRI Scan',
            status: 'completed',
            segmentedImagePath: '/uploads/results/' +segmentImagePath ,
            cancerDetected: cancerDetected,
            cancerType: cancerType,
            gliomaProbability: probabilities.glioma,
            meningiomaProbability: probabilities.meningioma,
            pituitaryProbability: probabilities.pituitary,
            noTumorProbability: probabilities.no_tumor
          };
          
          const scanId=await Scan.create(scanData);
          scanData.scan_id = scanId;
          // Redirect to results page
          req.flash('success_msg', 'Scan processed successfully');
        //   return res.redirect(`/scans/results/${scanId}`);
          return res.render(`scan_results_page`, {
            title: 'Scan Analysis Results',
        activeTab: 'process-scan',
        scanData,
        patient,
        messages: req.flash() // Make sure to pass the flash messages
          });
        } else {
          throw new Error(modelResponse.data.error || 'Model processing error In Python Code');
        }
      } catch (modelError) {
        console.error('Error from model server:', modelError);
        req.flash('error_msg', 'Error processing scan with AI model');
        return res.redirect('/scans/process');
      }
    } catch (error) {
      console.error('Error processing scan:', error);
      req.flash('error_msg', 'Error processing scan: ' + error.message);
      return res.redirect('/scans/process');
    }
  },
  
  saveDoctorsNotes:async (req, res) => {
    try {
        const { scanId, doctorsNotes } = req.body;

        if (!scanId) {
            return res.status(400).json({
                success: false,
                message: 'Scan ID is required'
            });
        }

        // Find the scan and update the doctor's notes
        const updatedScan = await Scan.updateDoctorsNotes(
            scanId,
            doctorsNotes,
        );
        console.log(updatedScan)
        if (!updatedScan) {
            return res.status(404).json({
                success: false,
                message: 'Scan not found'
            });
        }

        const scanData=await Scan.findById(scanId);
        console.log(scanData)
        const patient_id=scanData.patient_id;
        req.flash('success_msg', 'Save Doctor Note Along Scan successfully');
        res.redirect(`/patients/${patient_id}`)
        // // Return success response
        // return res.status(200).json({
        //     success: true,
        //     message: 'Doctor\'s notes saved successfully',
        //     scan: updatedScan
        // });
    } catch (error) {
        console.error('Error saving doctor\'s notes:', error);
        return res.status(500).json({
            success: false,
            message: 'Error saving doctor\'s notes',
            error: error.message
        });
    }
},

  // Display scan results
  getScanResults: async (req, res) => {
    try {
      const scanId = req.params.id;
      
      // Get scan with patient info
      const scan = await Scan.findByIdWithPatient(scanId);
      
      if (!scan || scan.patient.doctor_id !== req.user.doctor_id) {
        req.flash('error_msg', 'Scan not found');
        return res.redirect('/patients');
      }
      
      // Parse classification data
      let categories = {};
      try {
        if (scan.classification) {
          categories = JSON.parse(scan.classification);
        }
      } catch (e) {
        console.error('Error parsing classification data:', e);
        categories = {};
      }
      
      res.render('scan_results_page', {
        title: 'Scan Results',
        activeTab: 'process-scan',
        scan: scan,
        categories: categories,
        // messages: req.flash()
      });
    } catch (error) {
      console.error('Error getting scan results:', error);
      req.flash('error_msg', 'Error retrieving scan results');
      res.redirect('/patients');
    }
  },
  // Add this to your scanController.js
deleteScan: async (req, res) => {
  try {
    const { scanId,patient_id } = req.body;
    
    if (!scanId) {
      req.flash('error_msg', 'Scan ID is required');
      return res.redirect('back');
    }
    
    // Delete the scan
    const deleted = await Scan.deleteById(scanId, req.user.doctor_id);
    
    if (deleted) {
      req.flash('success_msg', 'Scan deleted successfully');
    } else {
      req.flash('error_msg', 'Failed to delete scan or scan not found');
    }
    
    // Redirect back to the referring page (usually patient details)
    return res.redirect(`/patients/${patient_id}`);
  } catch (error) {
    console.error('Error deleting scan:', error);
    req.flash('error_msg', 'Error deleting scan: ' + error.message);
    return res.redirect('back');
  }
}
};

module.exports = ScanController;