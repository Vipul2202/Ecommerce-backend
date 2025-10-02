const nodemailer = require('nodemailer');

// Test Zoho Mail SMTP configuration
async function testZohoMail() {
  console.log('Testing Zoho Mail SMTP Configuration...');
  console.log('=====================================');
  
  // Check if credentials are set
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  
  console.log('Email User:', emailUser);
  console.log('Email Pass:', emailPass ? '***' + emailPass.slice(-4) : 'NOT SET');
  
  if (!emailUser || emailUser === 'your_actual_zoho_email@zoho.com') {
    console.log('❌ Please set your actual Zoho Mail credentials in .env file');
    console.log('📝 Update EMAIL_USER and EMAIL_PASS with your real Zoho Mail details');
    return;
  }
  
  // Zoho Mail SMTP configurations to try
  const configs = [
    {
      name: 'Zoho Mail SSL (Port 465)',
      config: {
        host: 'smtp.zoho.com',
        port: 465,
        secure: true,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        connectionTimeout: 20000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        tls: {
          rejectUnauthorized: false
        }
      }
    },
    {
      name: 'Zoho Mail STARTTLS (Port 587)',
      config: {
        host: 'smtp.zoho.com',
        port: 587,
        secure: false,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        connectionTimeout: 20000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        tls: {
          rejectUnauthorized: false
        }
      }
    },
    {
      name: 'Zoho Mail Alternative (Port 2525)',
      config: {
        host: 'smtp.zoho.com',
        port: 2525,
        secure: false,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        connectionTimeout: 20000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        }
      }
    }
  ];
  
  for (let i = 0; i < configs.length; i++) {
    const { name, config } = configs[i];
    console.log(`\n${i + 1}. Testing ${name}...`);
    
    try {
      const transporter = nodemailer.createTransport(config);
      
      // Test connection
      await new Promise((resolve, reject) => {
        transporter.verify((error, success) => {
          if (error) {
            console.log(`❌ ${name} failed:`, error.message);
            reject(error);
          } else {
            console.log(`✅ ${name} connection successful!`);
            resolve(success);
          }
        });
      });
      
      // If we get here, connection was successful
      console.log(`🎉 ${name} is working! You can use this configuration.`);
      
      // Test sending an email
      console.log(`📧 Testing email send with ${name}...`);
      const info = await transporter.sendMail({
        from: `"Car Salon" <${emailUser}>`,
        to: 'nik.05.jindal@gmail.com',
        subject: 'Zoho Mail SMTP Test',
        html: `
          <h2>Zoho Mail SMTP Test</h2>
          <p>This email was sent using ${name}</p>
          <p>Time: ${new Date().toISOString()}</p>
          <p>Configuration: ${name}</p>
        `
      });
      
      console.log(`✅ Email sent successfully with ${name}!`);
      console.log(`📧 Message ID: ${info.messageId}`);
      return; // Exit on first successful configuration
      
    } catch (error) {
      console.log(`❌ ${name} failed:`, error.message);
      continue;
    }
  }
  
  console.log('\n❌ All Zoho Mail configurations failed');
  console.log('💡 Possible issues:');
  console.log('   - DigitalOcean blocking SMTP ports');
  console.log('   - Wrong email credentials');
  console.log('   - Need to use App Password instead of regular password');
  console.log('   - Zoho Mail account not properly configured');
}

// Run the test
testZohoMail().then(() => {
  console.log('\nZoho Mail test completed');
  process.exit(0);
}).catch(error => {
  console.error('Zoho Mail test error:', error);
  process.exit(1);
});
