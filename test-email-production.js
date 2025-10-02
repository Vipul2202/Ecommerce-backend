const { testEmailConfig } = require('./src/utils/sendemail');

async function testEmail() {
  console.log('Testing email configuration for DigitalOcean...');
  console.log('=====================================');
  
  try {
    // Test the new hybrid email system
    const result = await testEmailConfig();
    
    if (result) {
      console.log('✅ Email test completed successfully!');
      console.log('📧 Check nik.05.jindal@gmail.com for the test email');
    } else {
      console.log('❌ Email test failed');
      console.log('💡 Consider setting up SendGrid for DigitalOcean compatibility');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testEmail().then(() => {
  console.log('Email test completed');
  process.exit(0);
}).catch(error => {
  console.error('Email test error:', error);
  process.exit(1);
});
