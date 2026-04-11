const { pool, User, OTPSession } = require('./src/models/user');

const testDatabase = async () => {
  try {
    console.log('🧪 Testing database connection...');
    
    // Test connection
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0]);

    // Test user creation
    console.log('\n📝 Testing user creation...');
    const testUser = await User.create(
      'test@example.com',
      'hashed_password_example',
      'Test',
      'User'
    );
    console.log('✅ User created:', testUser);

    // Test find user
    console.log('\n🔍 Testing user lookup...');
    const foundUser = await User.findByEmail('test@example.com');
    console.log('✅ User found:', foundUser);

    // Test OTP creation
    console.log('\n📝 Testing OTP creation...');
    const otpSession = await OTPSession.create('test@example.com', '123456');
    console.log('✅ OTP created:', otpSession);

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await pool.query('DELETE FROM otp_sessions WHERE email = $1', ['test@example.com']);
    await pool.query('DELETE FROM users WHERE email = $1', ['test@example.com']);
    console.log('✅ Test data cleaned up');

    console.log('\n✅ All database tests passed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database test failed:', err);
    process.exit(1);
  }
};

testDatabase();
