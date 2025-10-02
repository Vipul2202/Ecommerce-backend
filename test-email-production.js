const transporter = require('./src/config/mailier');
const { sendEmail } = require('./src/utils/sendemail');

async function testEmail() {
  console.log('Testing email configuration...');
  
  try {
    // Test transporter verification
    console.log('1. Testing transporter verification...');
    await new Promise((resolve, reject) => {
      transporter.verify((error, success) => {
        if (error) {
          console.error('Transporter verification failed:', error.message);
          reject(error);
        } else {
          console.log('✅ Transporter verification successful');
          resolve(success);
        }
      });
    });

    // Test actual email sending
    console.log('2. Testing email sending...');
    const result = await sendEmail({
      to: 'nik.05.jindal@gmail.com',
      subject: 'Test Email from DigitalOcean Server',
      html: `
        <h2>Email Test</h2>
        <p>This is a test email from your DigitalOcean server.</p>
        <p>Time: ${new Date().toISOString()}</p>
        <p>Server: DigitalOcean Production</p>
      `
    });

    if (result) {
      console.log('✅ Email sent successfully!');
    } else {
      console.log('❌ Email sending failed');
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
