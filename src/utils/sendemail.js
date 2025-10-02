const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Create SMTP transporter as fallback
const createSMTPTransporter = () => {
  // Zoho Mail Configuration (Primary - Port 465 with SSL)
  const zohoConfig = {
    host: 'smtp.zoho.com.au', // Updated from user's config
    port: 465,
    secure: true, // SSL
    auth: {
      user: process.env.EMAIL_USER || 'carsaloonperth@gmail.com',
      pass: process.env.EMAIL_PASS || 'bftoktcwzyknaura',
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
    host: 'smtp.zoho.com.au', // Updated from user's config
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.EMAIL_USER || 'carsaloonperth@gmail.com',
      pass: process.env.EMAIL_PASS || 'bftoktcwzyknaura',
    },
    connectionTimeout: 20000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: {
      rejectUnauthorized: false
    }
  };

  // Zoho Mail Alternative Port (2525 - Often not blocked)
  const zohoAlternativeConfig = {
    host: 'smtp.zoho.com.au', // Updated from user's config
    port: 2525,
    secure: false, // STARTTLS
    auth: {
      user: process.env.EMAIL_USER || 'carsaloonperth@gmail.com',
      pass: process.env.EMAIL_PASS || 'bftoktcwzyknaura',
    },
    connectionTimeout: 20000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    }
  };

  // Gmail Configuration (Fallback)
  const gmailConfig = {
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'carsaloonperth@gmail.com',
      pass: process.env.EMAIL_PASS || 'bftoktcwzyknaura',
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
  const configs = [zohoConfig, zohoPort587Config, zohoAlternativeConfig, gmailConfig];
  
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

// Enhanced email sending with SendGrid primary and SMTP fallback
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

  // Try SendGrid first (best for DigitalOcean)
  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'your_sendgrid_api_key_here') {
    try {
      console.log(`SendGrid attempt to: ${to}`);
      
      const msg = {
        to: to,
        from: {
          email: process.env.EMAIL_USER || 'carsaloonperth@gmail.com',
          name: 'Car Salon'
        },
        subject: subject,
        html: html,
      };

      const response = await sgMail.send(msg);
      console.log(`✅ SendGrid email sent successfully:`, response[0].headers['x-message-id']);
      return true;
      
    } catch (error) {
      console.error(`SendGrid failed:`, error.message);
      console.log('Falling back to SMTP...');
    }
  } else {
    console.log('SendGrid API key not configured, using SMTP...');
  }

  // Fallback to SMTP with retry logic
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
        from: 'Car Salon <car salon>',
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

// Test function for both SendGrid and SMTP
exports.testEmailConfig = async () => {
  console.log('Testing email configuration...');
  
  const testEmail = {
    to: 'nik.05.jindal@gmail.com',
    subject: 'Email Configuration Test',
    html: `
      <h2>Email Test</h2>
      <p>This is a test email to verify email configuration.</p>
      <p>Time: ${new Date().toISOString()}</p>
      <p>Server: DigitalOcean Production</p>
    `
  };

  const result = await exports.sendEmail(testEmail);
  
  if (result) {
    console.log('✅ Email test successful!');
  } else {
    console.log('❌ Email test failed');
  }
  
  return result;
};

module.exports = exports;