module.exports = {
    // Check if user is authenticated
    ensureAuthenticated: (req, res, next) => {
      if (req.isAuthenticated()) {
        return next();
      }
      req.flash('error_msg', 'Please log in to access this resource');
      res.redirect('/auth/login');
    },
        
    // Check if user is not authenticated (for login/signup pages)
    forwardAuthenticated: (req, res, next) => {
    console.log("Authetication Status:",req.isAuthenticated())
      if (!req.isAuthenticated()) {
        console.log("Not authenticated,so forward to login page",req.isAuthenticated())
        return next();
      }
      res.redirect('/dashboard'); // Redirect to dashboard if already logged in
    }
  };