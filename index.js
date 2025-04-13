const express = require("express");
const app = express();
require("dotenv").config();
const path = require("path");
const methodOverride = require("method-override");
const engine = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");
const viewHelper = require('./utils/viewHelper');
const expressLayouts = require('express-ejs-layouts');
const passport = require("passport");
require('./config/passport')(passport);

// 1. Configure session settings
const SessionOption = {
  secret: "your-secret-key", // a secret key used to sign the session ID cookie
  resave: false, // do not save the session if it hasn't been modified
  saveUninitialized: true, // save a session even if it is uninitialized
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

// 2. Basic Express middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "/public")));
app.use(methodOverride("_method"));

// 3. Session, authentication, and flash middleware
app.use(session(SessionOption));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// 4. View engine setup
app.engine("ejs", engine);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

// 5. Express layouts setup
app.use(expressLayouts);
app.set('layout', 'layouts/boilerplate');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// 6. Global variables middleware - MUST BE BEFORE ROUTES
app.use((req, res, next) => {
  res.locals.user = {
    id: req.session.userId || null,
    firstName: req.session.first_name || '',
    lastName: req.session.last_name || '',
    email: req.session.userEmail || '',
    specialization: req.session.specialization || '',
    name: req.session.first_name ? `${req.session.first_name} ${req.session.last_name}` : 'Guest'
  };
  const messages = req.flash();
  console.log('Request Path:', req.path); 
  console.log('Flash messages in middleware:', messages);
  // res.locals.activeTab = ''; // Default value for activeTab
  res.locals.messages = messages; // Make messages available to all views
  if (viewHelper) {
    // Apply any additional view helpers
    Object.keys(viewHelper).forEach(key => {
      res.locals[key] = viewHelper[key];
    });
  }
  next();
});

// 7. Import routes
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const scanRoutes = require('./routes/scanRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// 8. API routes should come before more general routes

app.use('/auth', authRoutes);
app.use('/patients', patientRoutes);
app.use('/scans', scanRoutes);
app.use('/dashboard', dashboardRoutes);


// Error handling middleware
app.use((req, res, next) => {
  res.status(404).render('error', { 
    message: 'Page not found',
    error: { status: 404 }
  });
});

// 11. Home route redirects to login
app.get("/", (req, res) => {
  res.redirect("/auth/login");
});

// 12. Start the server
app.listen(8000, () => {
  console.log("Server has been started on port 8000");
});