require('dotenv').config();
const nodemailer = require('nodemailer');

async function sendTestEmail() {
  console.log('📧 Sending test email to menikhiljindal@gmail.com...');
  
  // Get credentials
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  
  console.log('🔍 Credentials check:');
  console.log(`   User: ${emailUser ? `${emailUser.substring(0, 3)}***@${emailUser.split('@')[1]}` : 'NOT SET'}`);
  console.log(`   Pass: ${emailPass ? `***${emailPass.slice(-4)}` : 'NOT SET'}`);
  console.log('');

  if (!emailUser || !emailPass) {
    console.log('❌ Missing EMAIL_USER or EMAIL_PASS in .env file');
    return false;
  }

  // Zoho Mail Configuration (Port 465 with SSL)
  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com.au',
    port: 465,
    secure: true, // SSL
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    connectionTimeout: 20000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: {
      rejectUnauthorized: false
    },
    debug: true,
    logger: true
  });

  try {
    console.log('🔗 Testing connection...');
    await transporter.verify();
    console.log('✅ Connection verified successfully!');
    console.log('');

    console.log('📤 Sending test email...');
    const info = await transporter.sendMail({
      from: `Car Salon <${emailUser}>`,
      to: 'menikhiljindal@gmail.com',
      subject: 'Test Email from Car Salon Backend',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">🧪 Test Email from Car Salon Backend</h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #28a745; margin-top: 0;">✅ Email Configuration Test</h3>
            <p>This is a test email to verify that the Zoho Mail SMTP configuration is working correctly.</p>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h4 style="margin-top: 0; color: #1976d2;">📋 Configuration Details:</h4>
            <ul style="margin: 0;">
              <li><strong>Server:</strong> smtp.zoho.com.au</li>
              <li><strong>Port:</strong> 465 (SSL)</li>
              <li><strong>From:</strong> ${emailUser}</li>
              <li><strong>To:</strong> menikhiljindal@gmail.com</li>
              <li><strong>Time:</strong> ${new Date().toISOString()}</li>
            </ul>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h4 style="margin-top: 0; color: #856404;">🎯 Purpose:</h4>
            <p>This email confirms that:</p>
            <ul>
              <li>Zoho Mail SMTP connection is working</li>
              <li>Authentication is successful</li>
              <li>Email delivery is functional</li>
              <li>Backend can send emails to users</li>
            </ul>
          </div>
          
          <hr style="border: none; border-top: 2px solid #dee2e6; margin: 30px 0;">
          
          <p style="color: #6c757d; font-size: 14px; text-align: center;">
            <em>This is an automated test email from the Car Salon booking system.</em>
          </p>
        </div>
      `,
    });

    console.log('✅ Test email sent successfully!');
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`📧 Response: ${info.response}`);
    console.log('');
    console.log('🎉 SUCCESS: Zoho Mail SMTP is working perfectly!');
    console.log('📬 Check menikhiljindal@gmail.com inbox for the test email.');
    
    return true;

  } catch (error) {
    console.log('❌ Failed to send test email:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code}`);
    
    if (error.code === 'EAUTH') {
      console.log('');
      console.log('🔧 Authentication Error - Possible solutions:');
      console.log('1. Check if EMAIL_USER and EMAIL_PASS are correct in .env');
      console.log('2. Ensure you\'re using Zoho App Password (not regular password)');
      console.log('3. Verify your Zoho Mail account has SMTP enabled');
    }
    
    return false;
  }
}

sendTestEmail().then(result => {
  process.exit(result ? 0 : 1);
}).catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
