// controllers/dashboardController.js
const Patient = require('../models/patientModel');
const Scan = require('../models/scanModel');

const getDashboard = async (req, res) => {
  try {
    const doctorId = req.session.userId; // Assuming you store logged-in user ID in session
    console.log(req.session)
    // Get all statistics in parallel
    const [
      totalPatients,
      patientGrowth,
      totalScans,
      scanGrowth,
      positiveFindings,
      pendingAnalysis,
      urgentCases,
      monthlyCounts,
      findingsByType,
      recentPatients,
      recentScans,
      // Add age distribution data from the Patient model
      ageDistribution
    ] = await Promise.all([
      Patient.getCount(doctorId),
      Patient.getPatientGrowthPercentage(doctorId),
      Scan.getCount(doctorId),
      Scan.getScanGrowthPercentage(doctorId),
      Scan.getPositiveCount(doctorId),
      Scan.getPendingCount(doctorId),
      Scan.getUrgentPendingCount(doctorId),
      Scan.getMonthlyCounts(doctorId),
      Scan.getScansByType(doctorId),
      Patient.getRecentWithStatus(doctorId, 5),
      Scan.getRecentWithPatientInfo(doctorId, 5),
      // Use the new Patient model method
      Patient.getAgeDistribution(doctorId)
    ]);
    
    // Calculate positive findings percentage
    const positivePercentage = totalScans > 0 ? (positiveFindings / totalScans) * 100 : 0;
    
    // Process monthly data for chart (keeping this for backward compatibility)
    const monthLabels = [];
    const monthlyTotalScans = [];
    const monthlyPositiveFindings = [];
    
    // Make sure we have at least some data even if no real data is available
    if (monthlyCounts.length === 0) {
      // Provide default data for the last 6 months
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear().toString().substr(2, 2);
      
      months.forEach(month => {
        monthLabels.push(`${month} '${currentYear}`);
        monthlyTotalScans.push(0);
        monthlyPositiveFindings.push(0);
      });
    } else {
      // Format month names and collect data for the chart
      monthlyCounts.forEach(item => {
        // Convert YYYY-MM to human readable month
        const date = new Date(item.month + '-01');
        const monthName = date.toLocaleString('default', { month: 'short' });
        const yearShort = date.getFullYear().toString().substr(2, 2);
        
        monthLabels.push(`${monthName} '${yearShort}`);
        monthlyTotalScans.push(item.total_scans || 0);
        monthlyPositiveFindings.push(item.positive_findings || 0);
      });
    }
    
    // Process findings by type data for chart
    const findingLabels = [];
    const findingData = [];
    
    if (findingsByType.length === 0) {
      // Provide default categories if no data
      findingLabels.push('No Data');
      findingData.push(1);
    } else {
      findingsByType.forEach(item => {
        findingLabels.push(item.type || 'Unknown');
        findingData.push(item.count || 0);
      });
    }
    
    // Prepare chart data
    const chartData = {
      // Include the original scan trends data for backward compatibility
      scanTrends: {
        labels: monthLabels,
        totalScans: monthlyTotalScans,
        positiveFindings: monthlyPositiveFindings
      },
      findingsByType: {
        labels: findingLabels,
        data: findingData
      },
      // Add age distribution data
      ageDistribution: ageDistribution
    };
    
    // Prepare stats data
    const stats = {
      totalPatients,
      patientGrowth,
      totalScans,
      scanGrowth,
      positiveFindings,
      positivePercentage,
      pendingAnalysis,
      urgentCases
    };
    console.log(stats)
    
    // Get user information
    const user = {
      name: req.session.first_name || 'Doctor',
      specilization: req.session.specilization || "Nero-Radiologist"
    };
    
    // Render the dashboard view with all the data
    res.render('dashboard-page', {
      title: "Dashboard",
      activeTab: 'dashboard',
      stats,
      chartData,
      recentPatients,
      recentScans,
      user // Make sure to include the user object
    });
    
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).render('error', { 
      message: 'Error loading dashboard data',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};

module.exports = {
  getDashboard
};