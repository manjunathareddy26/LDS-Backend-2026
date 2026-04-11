const { User, pool } = require('./src/models/user');
require('dotenv').config();

async function createTestUser() {
  try {
    console.log('🔄 Creating test user...');
    
    // Hash a test password
    const testEmail = 'test@example.com';
    const testPassword = 'TestPassword123!';
    
    // Check if user already exists
    const existingUser = await User.findByEmail(testEmail);
    if (existingUser) {
      console.log('✅ User already exists:', testEmail);
      console.log('📋 User ID:', existingUser.id);
      console.log('📋 Email:', existingUser.email);
      console.log('📋 Password Hash:', existingUser.password_hash ? '✅ Has password' : '❌ No password');
      process.exit(0);
    }

    // Hash the password
    const passwordHash = await User.hashPassword(testPassword);
    console.log('🔒 Password hashed');

    // Create the user
    const user = await User.create(
      testEmail,
      passwordHash,
      'Test',
      'User'
    );
    console.log('✅ Test user created successfully!');
    console.log('📋 User ID:', user.id);
    console.log('📋 Email:', user.email);
    console.log('📋 Password: TestPassword123!');
    console.log('');
    console.log('🔑 Use these credentials to test signin:');
    console.log('   Email: test@example.com');
    console.log('   Password: TestPassword123!');
    
    // Mark email as verified
    await User.update(user.id, { is_email_verified: true });
    console.log('✅ Email marked as verified');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating test user:', err.message);
    process.exit(1);
  }
}

createTestUser();
