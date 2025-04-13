const viewHelper = (req, res, next) => {
    // Default values
    res.locals.activeTab = '';
    res.locals.title = 'NeuroScan';
    
    // Set active tab based on route
    const path = req.path;
    
    if (path === '/dashboard') {
        res.locals.activeTab = 'dashboard';
        res.locals.title = 'Dashboard';
    } else if (path === '/patients/add') {
        res.locals.activeTab = 'add-patient';
        res.locals.title = 'Add New Patient';
    } else if (path.startsWith('/patients')) {
        if (path === '/patients') {
            res.locals.activeTab = 'patients';
            res.locals.title = 'All Patients';
        } else {
            // Patient details page
            res.locals.activeTab = 'patients';
            // Title will be set in the controller
        }
    } else if (path.startsWith('/scans/process')) {
        res.locals.activeTab = 'process-scan';
        res.locals.title = 'Process Scan';
    }

    next();
};

module.exports = viewHelper;