const express = require('express');
const router = express.Router();
const ScanController = require('../controllers/scanController');
const { ensureAuthenticated } = require('../utils/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // ✅ Required to manage filesystem

// Configure storage for uploaded scan files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../public/uploads/scans');

    // ✅ Check if the folder exists, if not, create it
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'scan-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|dicom|dcm|nii|nii.gz/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype || extname) {
      return cb(null, true);
    }
    cb(new Error('Only image and medical scan files are allowed!'));
  }
});

// Apply authentication middleware to all scan routes
router.use(ensureAuthenticated);

// Render scan page
router.get('/process', ScanController.getScanPage);

// Process scan upload
router.post('/process/', upload.single('scanFile'), ScanController.processScan);

// New route for saving doctor's notes
router.post('/results/save-notes', ScanController.saveDoctorsNotes);
// View scan results
router.get('/results/:id', ScanController.getScanResults);

router.post('/delete', ScanController.deleteScan);

// API callback for async processing
// router.post('/api/scans/callback/:id', ScanController.processCallback);

module.exports = router;
