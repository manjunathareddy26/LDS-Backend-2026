const express = require('express');
const router = express.Router();
const passport = require('passport');
require('../config/passport');
const authController = require('../controllers/authController');

// Check if user exists
router.post('/check-user', authController.checkUserExists);

// Request OTP for signup
router.post('/request-otp-signup', authController.requestOTPSignup);

// Request OTP for signin
router.post('/request-otp-signin', authController.requestOTPSignin);

// Verify OTP and complete signup
router.post('/verify-otp-signup', authController.verifyOTPSignup);

// Verify OTP and complete signin
router.post('/verify-otp-signin', authController.verifyOTPSignin);

// Signin with email and password
router.post('/signin-password', authController.signinWithPassword);

// Signup with email and password (direct, no OTP)
router.post('/signup-password', authController.signupWithPassword);

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      console.log('📋 [Google Callback] Starting callback handler');
      console.log('📋 [Google Callback] req.user:', req.user);
      
      // req.user is already the deserialized user object from the database
      const { id, email, first_name, last_name } = req.user;
      
      if (!email || !id) {
        console.error('❌ [Google Callback] Missing email or user ID from deserialized user');
        throw new Error('Invalid user data');
      }

      console.log('🔐 [Google Callback] Processing:', { googleId: id, email, first_name, last_name });

      const User = require('../models/user').User;

      // User already exists in database (req.user is deserialized data)
      const user = req.user;
      console.log('✅ [Google Callback] User verified:', { userId: user.id, email: user.email });

      // Set session
      req.session.userId = user.id;
      req.session.email = user.email;
      console.log('✅ [Google Callback] Session userId set:', req.session.userId);
      console.log('✅ [Google Callback] Session email set:', req.session.email);

      // Save session explicitly and wait
      req.session.save((err) => {
        if (err) {
          console.error('❌ [Google Callback] Session save error:', err);
          return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/signin?error=Session%20save%20error`);
        }
        console.log('✅ [Google Callback] Session saved successfully');
        console.log('✅ [Google Callback] Redirecting to frontend callback...');
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/google/callback`);
      });
    } catch (err) {
      console.error('❌ [Google Callback] Error:', err);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/signin?error=${encodeURIComponent(err.message)}`);
    }
  }
);

// Test endpoint to debug session
router.get('/test-session', (req, res) => {
  console.log('🧪 [Test Session] req.session:', req.session);
  console.log('🧪 [Test Session] req.sessionID:', req.sessionID);
  console.log('🧪 [Test Session] req.user:', req.user);
  console.log('🧪 [Test Session] Cookies:', req.headers.cookie);
  
  res.json({
    session: req.session,
    sessionID: req.sessionID,
    userId: req.session.userId,
    authenticated: !!req.session.userId
  });
});

// Get current user
router.get('/me', authController.getCurrentUser);

// Logout
router.post('/logout', authController.logout);

// Forgot password - request reset token
router.post('/forgot-password', authController.forgotPassword);

// Verify reset token
router.post('/verify-reset-token', authController.verifyResetToken);

// Reset password with token
router.post('/reset-password', authController.resetPassword);

// Test endpoint - Send test OTP email (for debugging only)
router.post('/test-send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('🧪 [Test OTP] Sending test OTP email to:', email);

    // Import the sendOTPEmail function from authController
    const sendOTPEmail = require('../controllers/authController').sendOTPEmail;
    const testOTP = '123456';

    await sendOTPEmail(email, testOTP, true);

    res.json({
      message: 'Test OTP email sent successfully',
      email: email,
      testOTP: testOTP,
      note: 'Check your inbox and spam folder'
    });
  } catch (err) {
    console.error('❌ [Test OTP] Error:', err.message);
    res.status(500).json({ 
      error: err.message,
      note: 'Check the backend console for detailed error logs'
    });
  }
});

module.exports = router;
