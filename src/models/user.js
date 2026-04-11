const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Create users table if not exists (NEVER drops existing tables/data)
const initializeDB = async () => {
  try {
    console.log('🔍 Checking database schema...');

    // Create tables if they don't exist (preserves existing data)
    const createTablesQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        google_id VARCHAR(255) UNIQUE,
        is_email_verified BOOLEAN DEFAULT FALSE,
        reset_token VARCHAR(255),
        reset_token_expiry TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS otp_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        otp_code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        attempts INT DEFAULT 0,
        max_attempts INT DEFAULT 5,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
      CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_sessions(email);
    `;

    await pool.query(createTablesQuery);

    // Safely add columns that might be missing (no-op if they already exist)
    const addColumnIfMissing = async (table, column, type) => {
      try {
        await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}`);
      } catch (e) {
        // Column already exists — safe to ignore
      }
    };

    await addColumnIfMissing('users', 'reset_token', 'VARCHAR(255)');
    await addColumnIfMissing('users', 'reset_token_expiry', 'TIMESTAMP');

    console.log('✅ Database schema initialized successfully (existing data preserved)');
    console.log('✅ Tables: users, otp_sessions');
    console.log('✅ Columns: reset_token, reset_token_expiry ensured');
  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
    throw err;
  }
};

// User model functions
const User = {
  async findByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findByGoogleId(googleId) {
    const result = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    return result.rows[0];
  },

  async create(email, passwordHash, firstName, lastName) {
    const id = uuidv4();
    const result = await pool.query(
      'INSERT INTO users (id, email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, email, passwordHash, firstName, lastName]
    );
    return result.rows[0];
  },

  async createFromGoogle(email, firstName, lastName, googleId) {
    const id = uuidv4();
    const result = await pool.query(
      'INSERT INTO users (id, email, first_name, last_name, google_id, is_email_verified) VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *',
      [id, email, firstName, lastName, googleId]
    );
    return result.rows[0];
  },

  async update(id, updates) {
    const { first_name, last_name, is_email_verified } = updates;
    const result = await pool.query(
      'UPDATE users SET first_name = COALESCE($2, first_name), last_name = COALESCE($3, last_name), is_email_verified = COALESCE($4, is_email_verified), updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id, first_name, last_name, is_email_verified]
    );
    return result.rows[0];
  },

  async verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
  },

  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  },

  async setResetToken(email, resetToken) {
    const expiryTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const result = await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3 RETURNING *',
      [resetToken, expiryTime, email]
    );
    return result.rows[0];
  },

  async findByResetToken(resetToken) {
    const result = await pool.query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > CURRENT_TIMESTAMP',
      [resetToken]
    );
    return result.rows[0];
  },

  async updatePassword(id, newPasswordHash) {
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [newPasswordHash, id]
    );
    return result.rows[0];
  }
};

// OTP Session functions
const OTPSession = {
  async create(email, otpCode) {
    const id = uuidv4();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const result = await pool.query(
      'INSERT INTO otp_sessions (id, email, otp_code, expires_at) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, email, otpCode, expiresAt]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM otp_sessions WHERE email = $1 AND expires_at > CURRENT_TIMESTAMP AND is_verified = FALSE ORDER BY created_at DESC LIMIT 1',
      [email]
    );
    return result.rows[0];
  },

  async verify(email, otpCode) {
    const session = await this.findByEmail(email);

    if (!session) {
      throw new Error('OTP session expired or not found');
    }

    if (session.attempts >= session.max_attempts) {
      throw new Error('Maximum OTP attempts exceeded');
    }

    if (session.otp_code !== otpCode) {
      await pool.query(
        'UPDATE otp_sessions SET attempts = attempts + 1 WHERE id = $1',
        [session.id]
      );
      throw new Error('Invalid OTP');
    }

    const result = await pool.query(
      'UPDATE otp_sessions SET is_verified = TRUE WHERE id = $1 RETURNING *',
      [session.id]
    );
    return result.rows[0];
  },

  async deleteVerified(email) {
    await pool.query(
      'DELETE FROM otp_sessions WHERE email = $1 AND is_verified = TRUE',
      [email]
    );
  },

  async deleteByEmail(email) {
    await pool.query(
      'DELETE FROM otp_sessions WHERE email = $1',
      [email]
    );
  }
};

module.exports = {
  initializeDB,
  User,
  OTPSession,
  pool
};
