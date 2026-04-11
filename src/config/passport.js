const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User } = require('../models/user');
require('dotenv').config();

// Only configure Google OAuth if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        let user = await User.findByGoogleId(profile.id);

        if (!user) {
          const existingUser = await User.findByEmail(email);
          if (existingUser && !existingUser.google_id) {
            return done(null, false, { message: 'Email already registered' });
          }

          if (!existingUser) {
            const names = profile.displayName.split(' ');
            user = await User.createFromGoogle(
              email,
              names[0],
              names[1] || '',
              profile.id
            );
          } else {
            user = existingUser;
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));
} else {
  console.warn('⚠️  Google OAuth credentials not configured. Google login will be disabled.');
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
