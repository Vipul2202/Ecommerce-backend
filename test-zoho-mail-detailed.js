require('dotenv').config();
const nodemailer = require('nodemailer');

// Enhanced logging function
const logEmail = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [EMAIL-${level}] ${message}`);
  if (data) {
    console.log(`[${timestamp}] [EMAIL-${level}] Data:`, JSON.stringify(data, null, 2));
  }
};

async function testZohoMailDetailed() {
  console.log('🔍 Testing Zoho Mail SMTP with detailed logging...');
  console.log('📋 Configuration from your Zoho Mail settings:');
  console.log('   - Outgoing Server: smtp.zoho.com.au');
  console.log('   - Port: 465 (SSL) or 587 (TLS)');
  console.log('   - Authentication: Required');
  console.log('');
  
  // Check environment variables
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  
  logEmail('INFO', 'Environment variables check:', {
    user: emailUser ? `${emailUser.substring(0, 3)}***@${emailUser.split('@')[1]}` : 'NOT SET',
    pass: emailPass ? `***${emailPass.slice(-4)}` : 'NOT SET',
    isZoho: emailUser && emailUser.includes('@zoho.com')
  });

  if (!emailUser || !emailPass) {
    logEmail('ERROR', 'Missing EMAIL_USER or EMAIL_PASS in .env file');
    console.log('💡 Please update your .env file with:');
    console.log('   EMAIL_USER=your_actual_zoho_email@zoho.com');
    console.log('   EMAIL_PASS=your_actual_zoho_app_password');
    return false;
  }

  // Test configurations in order of preference
  const configs = [
    {
      name: 'Zoho Mail SSL (Port 465)',
      config: {
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
      }
    },
    {
      name: 'Zoho Mail STARTTLS (Port 587)',
      config: {
        host: 'smtp.zoho.com.au',
        port: 587,
        secure: false, // STARTTLS
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
      }
    }
  ];

  for (let i = 0; i < configs.length; i++) {
    const { name, config } = configs[i];
    logEmail('INFO', `Testing configuration ${i + 1}/${configs.length}: ${name}`);
    
    try {
      const transporter = nodemailer.createTransport(config);
      
      // Add event listeners for detailed logging
      transporter.on('token', token => {
        logEmail('DEBUG', 'SMTP Token received:', token);
      });
      
      transporter.on('idle', () => {
        logEmail('DEBUG', 'SMTP Connection is idle');
      });
      
      transporter.on('error', error => {
        logEmail('ERROR', 'SMTP Connection error:', error);
      });

      // Test connection
      logEmail('INFO', `Verifying connection for ${name}...`);
      
      await new Promise((resolve, reject) => {
        transporter.verify((error, success) => {
          if (error) {
            logEmail('ERROR', `${name} verification failed:`, {
              message: error.message,
              code: error.code,
              command: error.command,
              response: error.response,
              responseCode: error.responseCode
            });
            reject(error);
          } else {
            logEmail('SUCCESS', `${name} verification successful!`);
            resolve(success);
          }
        });
      });

      // If verification successful, try sending a test email
      logEmail('INFO', `Sending test email using ${name}...`);
      
      const info = await transporter.sendMail({
        from: `Car Salon <${emailUser}>`,
        to: process.env.ADMIN_EMAIL || 'nik.05.jindal@gmail.com',
        subject: 'Zoho Mail Test - Detailed Configuration',
        html: `
          <h2>Zoho Mail Test - Detailed Configuration</h2>
          <p>This is a test email sent via Zoho Mail SMTP using the configuration from your Zoho Mail settings.</p>
          <p><strong>Configuration Used:</strong> ${name}</p>
          <p><strong>Server:</strong> smtp.zoho.com.au</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>Server:</strong> DigitalOcean Production</p>
          <hr>
          <p><em>If you receive this email, Zoho Mail SMTP is working correctly!</em></p>
        `,
      });

      logEmail('SUCCESS', `Test email sent successfully using ${name}:`, {
        messageId: info.messageId,
        response: info.response
      });
      
      console.log('✅ SUCCESS: Zoho Mail SMTP is working!');
      console.log(`📧 Test email sent using: ${name}`);
      console.log(`📧 Message ID: ${info.messageId}`);
      
      return true;
      
    } catch (error) {
      logEmail('ERROR', `${name} failed:`, {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        stack: error.stack
      });
      
      console.log(`❌ ${name} failed: ${error.message}`);
      
      // Continue to next configuration
      if (i < configs.length - 1) {
        console.log('🔄 Trying next configuration...');
        console.log('');
      }
    }
  }
  
  logEmail('ERROR', 'All Zoho Mail configurations failed');
  console.log('❌ FAILED: All Zoho Mail SMTP configurations failed');
  console.log('');
  console.log('🔧 Troubleshooting steps:');
  console.log('1. Verify your Zoho Mail credentials in .env file');
  console.log('2. Ensure you\'re using an App Password (not regular password)');
  console.log('3. Check if your Zoho Mail account has SMTP enabled');
  console.log('4. Verify that DigitalOcean allows outbound connections on ports 465/587');
  console.log('5. Consider using SendGrid API as an alternative');
  
  return false;
}

testZohoMailDetailed().then(result => {
  process.exit(result ? 0 : 1);
}).catch(error => {
  console.error('Unhandled error during Zoho Mail test:', error);
  process.exit(1);
});
