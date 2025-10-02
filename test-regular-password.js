require('dotenv').config();
const nodemailer = require('nodemailer');

async function testZohoWithRegularPassword() {
  console.log('🔍 Testing Zoho Mail with regular password...');
  
  const emailUser = 'info@carsaloon.com.au';
  const emailPass = 'Waheguru9431';
  
  console.log(`📧 Testing: ${emailUser}`);
  console.log('');

  // Try different Zoho configurations
  const configs = [
    {
      name: 'Zoho Mail SSL (Port 465)',
      config: {
        host: 'smtp.zoho.com.au',
        port: 465,
        secure: true,
        auth: { user: emailUser, pass: emailPass },
        connectionTimeout: 20000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        tls: { rejectUnauthorized: false }
      }
    },
    {
      name: 'Zoho Mail STARTTLS (Port 587)',
      config: {
        host: 'smtp.zoho.com.au',
        port: 587,
        secure: false,
        auth: { user: emailUser, pass: emailPass },
        connectionTimeout: 20000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        tls: { rejectUnauthorized: false }
      }
    },
    {
      name: 'Zoho Mail Alternative (Port 2525)',
      config: {
        host: 'smtp.zoho.com.au',
        port: 2525,
        secure: false,
        auth: { user: emailUser, pass: emailPass },
        connectionTimeout: 20000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        tls: { rejectUnauthorized: false, ciphers: 'SSLv3' }
      }
    }
  ];

  for (let i = 0; i < configs.length; i++) {
    const { name, config } = configs[i];
    console.log(`🔄 Testing ${i + 1}/${configs.length}: ${name}`);
    
    try {
      const transporter = nodemailer.createTransport(config);
      
      // Test connection
      await transporter.verify();
      console.log(`✅ ${name} - Connection successful!`);
      
      // Try sending test email
      const info = await transporter.sendMail({
        from: `Car Salon <${emailUser}>`,
        to: 'nik.05.jindal@gmail.com',
        subject: 'Test Email - Zoho Regular Password',
        html: `
          <h2>Test Email from Car Salon</h2>
          <p>This email was sent using your regular password: Waheguru9431</p>
          <p>Configuration: ${name}</p>
          <p>Time: ${new Date().toISOString()}</p>
          <p>If you receive this, the regular password works!</p>
        `
      });
      
      console.log(`🎉 SUCCESS! Email sent using ${name}`);
      console.log(`📧 Message ID: ${info.messageId}`);
      return true;
      
    } catch (error) {
      console.log(`❌ ${name} failed: ${error.message}`);
      if (i < configs.length - 1) {
        console.log('🔄 Trying next configuration...');
        console.log('');
      }
    }
  }
  
  console.log('');
  console.log('❌ All configurations failed with regular password');
  console.log('🔧 You need to generate an App Password from Zoho Mail');
  console.log('');
  console.log('📋 Steps:');
  console.log('1. Go to https://mail.zoho.com');
  console.log('2. Login with info@carsaloon.com.au and Waheguru9431');
  console.log('3. Settings (⚙️) → Security → App Passwords');
  console.log('4. Generate new password for "Car Salon Backend"');
  console.log('5. Copy the generated password');
  
  return false;
}

testZohoWithRegularPassword().then(result => {
  process.exit(result ? 0 : 1);
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
