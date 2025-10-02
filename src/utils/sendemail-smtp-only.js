const nodemailer = require('nodemailer');

// Enhanced logging function
const logEmail = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [EMAIL-${level}] ${message}`);
  if (data) {
    console.log(`[${timestamp}] [EMAIL-${level}] Data:`, JSON.stringify(data, null, 2));
  }
};

// SMTP transporter configuration
const createSMTPTransporter = () => {
  // Zoho Mail Configuration (Primary - Port 465 with SSL)
  const zohoConfig = {
    host: 'smtp.zoho.com.au',
    port: 465,
    secure: true, // SSL
    auth: {
      user: process.env.EMAIL_USER || 'info@carsaloon.com.au',
      pass: process.env.EMAIL_PASS || 'kSXwtw5siPqP',
    },
    connectionTimeout: 20000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: {
      rejectUnauthorized: false
    }
  };

  // Zoho Mail Port 587 (STARTTLS)
  const zohoPort587Config = {
    host: 'smtp.zoho.com.au',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.EMAIL_USER || 'info@carsaloon.com.au',
      pass: process.env.EMAIL_PASS || 'kSXwtw5siPqP',
    },
    connectionTimeout: 20000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: {
      rejectUnauthorized: false
    }
  };

  // Gmail Configuration (Fallback)
  const gmailConfig = {
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'info@carsaloon.com.au',
      pass: process.env.EMAIL_PASS || 'kSXwtw5siPqP',
    },
    connectionTimeout: 30000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    rateDelta: 10000,
    rateLimit: 3,
    secure: true,
    port: 465,
    tls: {
      rejectUnauthorized: false
    }
  };

  // Try configurations in order of preference
  const configs = [zohoConfig, zohoPort587Config, gmailConfig];
  
  for (let i = 0; i < configs.length; i++) {
    try {
      console.log(`Trying SMTP configuration ${i + 1}/${configs.length}...`);
      return nodemailer.createTransport(configs[i]);
    } catch (error) {
      console.log(`SMTP configuration ${i + 1} failed:`, error.message);
      continue;
    }
  }
  
  // If all fail, return the first one anyway (will fail gracefully)
  console.log('All SMTP configurations failed, using Zoho as fallback');
  return nodemailer.createTransport(zohoConfig);
};

const smtpTransporter = createSMTPTransporter();

// Enhanced email sending with SMTP only (no axios dependency)
exports.sendEmail = async ({ to, subject, html }) => {
  // Validate required fields
  if (!to) {
    console.error('Email send error: No recipients defined - "to" field is required');
    return false;
  }
  if (!subject) {
    console.error('Email send error: Subject is required');
    return false;
  }
  if (!html) {
    console.error('Email send error: HTML content is required');
    return false;
  }

  console.log(`Zoho Mail SMTP attempt to: ${to}`);

  // SMTP with retry logic
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  // Sleep function for retry delays
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  let lastError = null;
  
  // Retry logic for SMTP
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`SMTP send attempt ${attempt}/${MAX_RETRIES} to: ${to}`);
      
      const info = await smtpTransporter.sendMail({
        from: `Car Salon <${process.env.EMAIL_USER || 'info@carsaloon.com.au'}>`,
        to,
        subject,
        html,
      });

      console.log(`✅ SMTP email sent successfully on attempt ${attempt}:`, info.messageId);
      return true;
      
    } catch (error) {
      lastError = error;
      console.error(`SMTP send attempt ${attempt} failed:`, error.message);
      
      // Don't retry on certain errors
      if (error.code === 'EAUTH' || error.code === 'EENVELOPE') {
        console.error('Authentication or envelope error, not retrying');
        break;
      }
      
      // Wait before retrying (except on last attempt)
      if (attempt < MAX_RETRIES) {
        console.log(`Waiting ${RETRY_DELAY}ms before retry...`);
        await sleep(RETRY_DELAY);
      }
    }
  }
  
  console.error('All email send attempts failed:', lastError);
  
  // Don't throw the error, just return false to prevent booking failure
  // The booking should still be created even if email fails
  return false;
};

// Test function for SMTP
exports.testEmailConfig = async () => {
  console.log('Testing SMTP configuration...');
  
  const testEmail = {
    to: 'nik.05.jindal@gmail.com',
    subject: 'SMTP Configuration Test',
    html: `
      <h2>SMTP Test</h2>
      <p>This is a test email to verify SMTP configuration.</p>
      <p>Time: ${new Date().toISOString()}</p>
      <p>Server: DigitalOcean Production</p>
      <p>Method: Zoho Mail SMTP</p>
    `
  };

  const result = await exports.sendEmail(testEmail);
  
  if (result) {
    console.log('✅ SMTP test successful!');
  } else {
    console.log('❌ SMTP test failed');
  }
  
  return result;
};

module.exports = exports;
