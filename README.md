# Backend Setup Guide

## Prerequisites
- Node.js (v14 or higher)
- PostgreSQL installed and running
- npm or yarn

## Installation Steps

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - The `.env` file is already configured with default values
   - Update database credentials if needed:
     ```
     DB_USER=postgres
     DB_PASSWORD=your_password
     DB_HOST=localhost
     DB_PORT=5432
     DB_NAME=login_auth
     ```

4. **Create PostgreSQL database**
   ```bash
   psql -U postgres
   CREATE DATABASE login_auth;
   \q
   ```

5. **Start the backend server**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/check-user` - Check if email exists
- `POST /api/auth/request-otp-signup` - Request OTP for signup
- `POST /api/auth/request-otp-signin` - Request OTP for signin
- `POST /api/auth/verify-otp-signup` - Verify OTP and complete signup
- `POST /api/auth/verify-otp-signin` - Verify OTP and complete signin
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

## Database
Tables created automatically on server start:
- `users` - Stores user account information
- `otp_sessions` - Stores OTP codes and sessions

## Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running
- Check DB credentials in `.env`
- Verify database exists

### Email not sending
- Update `EMAIL_USER` and `EMAIL_PASSWORD` in `.env`
- Enable "Less secure app access" for Gmail accounts
- Use Gmail app password if 2FA is enabled

### Google OAuth not working
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- Check that callback URL matches in Google Console
