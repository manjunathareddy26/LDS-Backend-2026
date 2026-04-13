const { User, OTPSession } = require('../models/user');
const { Resend } = require('resend');
const crypto = require('crypto');
require('dotenv').config();

// Resend configuration
const resend = new Resend(process.env.RESEND_API_KEY);

// Validate password strength
const validatePassword = (password) => {
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const hasMinLength = password.length >= 8;

  if (!hasMinLength) return 'Password must be at least 8 characters';
  if (!hasUppercase) return 'Password must contain at least 1 uppercase letter';
  if (!hasLowercase) return 'Password must contain at least 1 lowercase letter';
  if (!hasSpecialChar) return 'Password must contain at least 1 special character';
  return null;
};

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email via Resend
const sendOTPEmail = async (email, otp, isSignup = true) => {
  const subject = isSignup ? 'Your OTP for Sign Up' : 'Your OTP for Sign In';
  const htmlMessage = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #2563EB, #1d4ed8); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .otp-box { background-color: #f0f4ff; border-left: 4px solid #2563EB; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .otp-code { font-size: 32px; font-weight: bold; color: #2563EB; letter-spacing: 4px; text-align: center; }
        .footer { color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }
        .warning { color: #d32f2f; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${subject}</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Your One-Time Password (OTP) for Learn Data Skill is:</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <p><strong>This code will expire in 10 minutes.</strong></p>
          <p>Never share this OTP with anyone. We will never ask for your OTP.</p>
          <p>If you didn't request this, please ignore this email or contact support immediately.</p>
          <div class="footer">
            <p>Learn Data Skill Team</p>
            <p>© 2026 Learn Data Skill. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    console.log('📧 [OTP Email] Preparing to send via Resend:', {
      to: email,
      from: process.env.EMAIL_FROM,
      subject,
      type: isSignup ? 'signup' : 'signin'
    });

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,  // e.g. "Learn Data Skill <noreply@yourdomain.com>"
      to: email,
      subject,
      html: htmlMessage
    });

    if (error) {
      console.error('❌ [OTP Email] Resend API error:', error);
      throw new Error(`Resend error: ${error.message}`);
    }

    console.log('✅ [OTP Email] Email sent successfully via Resend:', {
      to: email,
      messageId: data.id
    });
    return true;
  } catch (err) {
    console.error('❌ [OTP Email] Error sending email:', {
      to: email,
      error: err.message
    });
    throw new Error(`Failed to send OTP email: ${err.message}`);
  }
};

// Send reset password email via Resend
const sendResetPasswordEmail = async (email, resetToken) => {
  try {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    const message = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #2563EB, #1d4ed8); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .button { display: inline-block; background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; }
        .warning { color: #d32f2f; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reset Your Password</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>We received a request to reset your password for your Learn Data Skill account.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetLink}" class="button">Reset Password</a>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${resetLink}</p>
          <p><span class="warning">⚠️ This link will expire in 15 minutes.</span></p>
          <p>If you didn't request this, please ignore this email or contact support immediately.</p>
          <div class="footer">
            <p>Learn Data Skill Team</p>
            <p>© 2026 Learn Data Skill. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

    console.log('📧 Sending reset password email via Resend to:', email);

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Reset Your Learn Data Skill Password',
      html: message
    });

    if (error) {
      console.error('❌ Resend API error for reset password email:', error);
      throw new Error(`Resend error: ${error.message}`);
    }

    console.log('✅ Reset password email sent successfully. Message ID:', data.id);
    return true;
  } catch (err) {
    console.error('❌ Error sending reset password email:', {
      email,
      error: err.message
    });
    throw new Error(`Email sending failed: ${err.message}`);
  }
};

// Auth controller
const authController = {
  // Check if user exists
  async checkUserExists(req, res) {
    try {
      const { email } = req.body;
      const user = await User.findByEmail(email);
      res.json({ exists: !!user });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Request OTP for signup
  async requestOTPSignup(req, res) {
    try {
      const { email, first_name, last_name } = req.body;
      console.log('📝 [SignUp OTP] Request received:', { email, first_name, last_name });

      if (!email) {
        console.log('❌ [SignUp OTP] Email is required');
        return res.status(400).json({ error: 'Email is required' });
      }

      // Check if email already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        console.log('❌ [SignUp OTP] Email already registered:', email);
        if (existingUser.google_id && !existingUser.password_hash) {
          return res.status(400).json({ error: 'This email is already registered with Google Sign-In. Please use "Continue with Google" to sign in.' });
        } else {
          return res.status(400).json({ error: 'Email already registered. Please sign in to your account.' });
        }
      }

      // Generate OTP
      const otp = generateOTP();
      console.log('✅ [SignUp OTP] Generated OTP:', { email, otp: otp.substring(0, 3) + '***' });

      // Save OTP to database
      const otpSession = await OTPSession.create(email, otp);
      console.log('✅ [SignUp OTP] OTP saved to database:', { email, otpSessionId: otpSession.id });

      // Send OTP email
      try {
        await sendOTPEmail(email, otp, true);
        console.log('✅ [SignUp OTP] OTP email sent successfully:', email);
      } catch (emailErr) {
        console.error('❌ [SignUp OTP] Failed to send OTP email:', emailErr.message);
        await OTPSession.deleteByEmail(email);
        return res.status(500).json({ error: emailErr.message });
      }

      // Store signup data in session
      req.session.signupData = {
        email,
        first_name,
        last_name,
        otpSessionId: otpSession.id
      };

      res.json({
        message: 'OTP sent to email. Please check your inbox.',
        otpSessionId: otpSession.id,
        expiresIn: 600
      });
    } catch (err) {
      console.error('❌ [SignUp OTP] Error:', err.message);
      res.status(500).json({ error: err.message });
    }
  },

  // Request OTP for signin
  async requestOTPSignin(req, res) {
    try {
      const { email, password } = req.body;
      console.log('🔑 [SignIn OTP] Request received:', { email, hasPassword: !!password });

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (password) {
        if (!user.password_hash) {
          return res.status(400).json({ error: 'This account uses Google Sign-In. Please use "Continue with Google" to sign in.' });
        }
        const isPasswordValid = await User.verifyPassword(password, user.password_hash);
        if (!isPasswordValid) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }
      } else {
        if (user.password_hash && !user.google_id) {
          return res.status(400).json({ error: 'Password is required for this account' });
        }
      }

      const otp = generateOTP();
      const otpSession = await OTPSession.create(email, otp);

      try {
        await sendOTPEmail(email, otp, false);
      } catch (emailErr) {
        console.error('❌ [SignIn OTP] Failed to send OTP email:', emailErr.message);
        await OTPSession.deleteByEmail(email);
        return res.status(500).json({ error: emailErr.message });
      }

      res.json({
        message: 'OTP sent to email. Please check your inbox.',
        otpSessionId: otpSession.id,
        expiresIn: 600
      });
    } catch (err) {
      console.error('❌ [SignIn OTP] Error:', err.message);
      res.status(500).json({ error: err.message });
    }
  },

  // Verify OTP and complete signup
  async verifyOTPSignup(req, res) {
    try {
      const { email, otp } = req.body;
      console.log('🔐 Verifying signup OTP:', { email });

      const passwordError = validatePassword(req.body.password);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }

      await OTPSession.verify(email, otp);

      const signupData = req.session.signupData;
      if (!signupData || signupData.email !== email) {
        return res.status(400).json({ error: 'Invalid signup session' });
      }

      const passwordHash = await User.hashPassword(req.body.password);
      const user = await User.create(email, passwordHash, signupData.first_name, signupData.last_name);
      await User.update(user.id, { is_email_verified: true });
      await OTPSession.deleteVerified(email);

      req.session.userId = user.id;
      req.session.email = user.email;
      delete req.session.signupData;

      req.session.save((err) => {
        if (err) {
          console.error('❌ [verifyOTPSignup] Session save error:', err);
          return res.status(500).json({ error: 'Failed to save session' });
        }
        res.json({
          message: 'Signup successful',
          user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name }
        });
      });
    } catch (err) {
      console.error('❌ Signup verification error:', err);
      res.status(400).json({ error: err.message });
    }
  },

  // Verify OTP and complete signin
  async verifyOTPSignin(req, res) {
    try {
      const { email, otp } = req.body;
      console.log('🔐 Verifying signin OTP:', { email });

      await OTPSession.verify(email, otp);

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await OTPSession.deleteVerified(email);

      req.session.userId = user.id;
      req.session.email = user.email;

      req.session.save((err) => {
        if (err) {
          console.error('❌ [verifyOTPSignin] Session save error:', err);
          return res.status(500).json({ error: 'Failed to save session' });
        }
        res.json({
          message: 'Signin successful',
          user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name }
        });
      });
    } catch (err) {
      console.error('❌ Signin verification error:', err);
      res.status(400).json({ error: err.message });
    }
  },

  // Direct signup with email and password (no OTP)
  async signupWithPassword(req, res) {
    try {
      const { email, password, confirmPassword, first_name, last_name } = req.body;

      if (!email || !password || !confirmPassword) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match' });
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        if (existingUser.google_id && !existingUser.password_hash) {
          return res.status(400).json({ error: 'This email is already registered with Google Sign-In. Please use "Continue with Google" to sign in.' });
        } else {
          return res.status(400).json({ error: 'Email already registered. Please sign in to your account.' });
        }
      }

      const passwordHash = await User.hashPassword(password);
      const user = await User.create(email, passwordHash, first_name || '', last_name || '');
      await User.update(user.id, { is_email_verified: true });

      req.session.userId = user.id;
      req.session.email = user.email;

      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to save session' });
        }
        res.json({
          message: 'Signup successful',
          user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name }
        });
      });
    } catch (err) {
      console.error('❌ Direct signup error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // Signin with email and password
  async signinWithPassword(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!user.password_hash) {
        return res.status(401).json({ error: 'This email is registered with Google OAuth only. Please sign in with Google or use the signup flow to set a password.' });
      }

      const isPasswordValid = await User.verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      req.session.userId = user.id;
      req.session.email = user.email;

      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to save session' });
        }
        res.json({
          message: 'Signin successful',
          user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name }
        });
      });
    } catch (err) {
      console.error('❌ [Signin Password] Error:', err.message);
      res.status(500).json({ error: err.message });
    }
  },

  // Google OAuth callback
  async googleAuthCallback(req, res) {
    try {
      const { id, emails, displayName } = req.user;
      const email = emails[0].value;
      const names = displayName.split(' ');

      let user = await User.findByGoogleId(id);

      if (!user) {
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
          return res.status(400).json({ error: 'Email already registered with different method' });
        }
        user = await User.createFromGoogle(email, names[0], names[1] || '', id);
      }

      req.session.userId = user.id;
      req.session.email = user.email;

      res.json({
        message: 'Google signin successful',
        user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name }
      });
    } catch (err) {
      console.error('❌ Google callback error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // Get current user
  async getCurrentUser(req, res) {
    try {
      const userId = req.session.userId || req.session.passport?.user;

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name }
      });
    } catch (err) {
      console.error('❌ [getCurrentUser] Error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  // Logout
  async logout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to logout' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  },

  // Forgot password - request reset token
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        return res.status(400).json({ error: 'Valid email is required' });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          error: 'No account found with this email. Please sign up first.',
          code: 'NOT_REGISTERED'
        });
      }

      if (!user.password_hash && user.google_id) {
        return res.status(400).json({
          error: 'This account is signed in with Google. Please sign in using "Continue with Google".',
          code: 'GOOGLE_ACCOUNT'
        });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      await User.setResetToken(email, resetToken);

      try {
        await sendResetPasswordEmail(email, resetToken);
      } catch (emailErr) {
        console.error('❌ Email sending failed:', emailErr.message);
        return res.status(500).json({
          error: 'Failed to send reset email. Please try again later.',
          details: emailErr.message
        });
      }

      res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    } catch (err) {
      console.error('❌ Forgot password error:', err);
      res.status(500).json({ error: 'Failed to process forgot password request: ' + err.message });
    }
  },

  // Verify reset token
  async verifyResetToken(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Reset token is required' });
      }

      const user = await User.findByResetToken(token);
      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      res.json({ message: 'Token is valid', email: user.email });
    } catch (err) {
      console.error('❌ Verify reset token error:', err);
      res.status(500).json({ error: 'Failed to verify reset token' });
    }
  },

  // Reset password with token
  async resetPassword(req, res) {
    try {
      const { token, newPassword, confirmPassword } = req.body;

      if (!token) return res.status(400).json({ error: 'Reset token is required' });
      if (!newPassword || !confirmPassword) return res.status(400).json({ error: 'Both passwords are required' });
      if (newPassword !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });

      const passwordError = validatePassword(newPassword);
      if (passwordError) return res.status(400).json({ error: passwordError });

      const user = await User.findByResetToken(token);
      if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

      const newPasswordHash = await User.hashPassword(newPassword);
      await User.updatePassword(user.id, newPasswordHash);

      res.json({
        message: 'Password reset successfully. Please sign in with your new password.',
        email: user.email
      });
    } catch (err) {
      console.error('❌ Reset password error:', err);
      res.status(500).json({ error: err.message || 'Failed to reset password' });
    }
  }
};

module.exports = authController;
module.exports.sendOTPEmail = sendOTPEmail;
module.exports.sendResetPasswordEmail = sendResetPasswordEmail;
