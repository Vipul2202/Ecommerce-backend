const axios = require('axios');
const { Resend } = require('resend');

// Resend API Configuration (works on DigitalOcean)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Enhanced logging function
const logEmail = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [EMAIL-${level}] ${message}`);
  if (data) {
    console.log(`[${timestamp}] [EMAIL-${level}] Data:`, JSON.stringify(data, null, 2));
  }
};

// Send email using Resend API (bypasses DigitalOcean SMTP blocking)
const sendEmailViaResend = async (emailData) => {
  try {
    logEmail('INFO', 'Sending email via Resend API...');
    
    const { data, error } = await resend.emails.send({
      from: 'Car Salon <onboarding@resend.dev>', // You can change this to your verified domain
      to: [emailData.to],
      subject: emailData.subject,
      html: emailData.html,
    });

    if (error) {
      logEmail('ERROR', 'Resend API error:', error);
      throw new Error(`Resend API error: ${error.message}`);
    }

    logEmail('SUCCESS', 'Email sent successfully via Resend API:', {
      id: data.id,
      to: emailData.to
    });
    
    return true;
    
  } catch (error) {
    logEmail('ERROR', 'Resend API email send failed:', {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Get Zoho Mail API access token
const getZohoAccessToken = async () => {
  try {
    logEmail('INFO', 'Getting Zoho Mail API access token...');
    
    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', {
      grant_type: 'client_credentials',
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      scope: 'ZohoMail.messages.CREATE'
    });

    logEmail('SUCCESS', 'Zoho access token obtained successfully');
    return response.data.access_token;
    
  } catch (error) {
    logEmail('ERROR', 'Failed to get Zoho access token:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
  }
};

// Send email using Zoho Mail API
const sendEmailViaZohoAPI = async (emailData) => {
  try {
    logEmail('INFO', 'Sending email via Zoho Mail API...');
    
    const accessToken = await getZohoAccessToken();
    
    const apiPayload = {
      fromAddress: process.env.EMAIL_USER || 'info@carsaloon.com.au',
      toAddress: emailData.to,
      subject: emailData.subject,
      content: emailData.html,
      mailFormat: 'html'
    };

    const response = await axios.post(
      `${ZOHO_API_BASE_URL}/messages`,
      apiPayload,
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    logEmail('SUCCESS', 'Email sent successfully via Zoho API:', {
      messageId: response.data.data?.messageId,
      status: response.status
    });
    
    return true;
    
  } catch (error) {
    logEmail('ERROR', 'Zoho API email send failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
  }
};

// Enhanced SMTP function with multiple configurations and retry logic
const sendEmailViaSMTP = async (emailData) => {
  const nodemailer = require('nodemailer');
  
  logEmail('INFO', 'Using SMTP for email delivery...');
  
  // Multiple SMTP configurations for DigitalOcean compatibility
  const smtpConfigs = [
    {
      name: 'Zoho Mail SSL (Port 465)',
      config: {
        host: 'smtp.zoho.com.au',
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER || 'info@carsaloon.com.au',
          pass: process.env.EMAIL_PASS || 'kSXwtw5siPqP',
        },
        connectionTimeout: 30000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        }
      }
    },
    {
      name: 'Zoho Mail STARTTLS (Port 587)',
      config: {
        host: 'smtp.zoho.com.au',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER || 'info@carsaloon.com.au',
          pass: process.env.EMAIL_PASS || 'kSXwtw5siPqP',
        },
        connectionTimeout: 30000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
        tls: {
          rejectUnauthorized: false
        }
      }
    },
    {
      name: 'Zoho Mail Alternative (Port 2525)',
      config: {
        host: 'smtp.zoho.com.au',
        port: 2525,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER || 'info@carsaloon.com.au',
          pass: process.env.EMAIL_PASS || 'kSXwtw5siPqP',
        },
        connectionTimeout: 30000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        }
      }
    }
  ];

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;

  // Sleep function for retry delays
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Try each configuration
  for (let configIndex = 0; configIndex < smtpConfigs.length; configIndex++) {
    const { name, config } = smtpConfigs[configIndex];
    
    logEmail('INFO', `Trying ${name}...`);
    
    try {
      const transporter = nodemailer.createTransport(config);
      
      // Test connection first
      await transporter.verify();
      logEmail('SUCCESS', `${name} connection verified`);
      
      // Try sending with retry logic
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          logEmail('INFO', `SMTP send attempt ${attempt}/${MAX_RETRIES} using ${name}`);
          
          const info = await transporter.sendMail({
            from: `Car Salon <${process.env.EMAIL_USER || 'info@carsaloon.com.au'}>`,
            to: emailData.to,
            subject: emailData.subject,
            html: emailData.html,
          });

          logEmail('SUCCESS', `Email sent successfully using ${name}:`, info.messageId);
          return true;
          
        } catch (error) {
          logEmail('ERROR', `${name} attempt ${attempt} failed:`, error.message);
          
          // Don't retry on certain errors
          if (error.code === 'EAUTH' || error.code === 'EENVELOPE') {
            logEmail('ERROR', 'Authentication or envelope error, trying next configuration');
            break;
          }
          
          // Wait before retrying (except on last attempt)
          if (attempt < MAX_RETRIES) {
            logEmail('INFO', `Waiting ${RETRY_DELAY}ms before retry...`);
            await sleep(RETRY_DELAY);
          }
        }
      }
      
    } catch (error) {
      logEmail('ERROR', `${name} connection failed:`, error.message);
      continue; // Try next configuration
    }
  }
  
  logEmail('ERROR', 'All SMTP configurations failed');
  throw new Error('All SMTP configurations failed');
};

// Main email sending function
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

  const emailData = { to, subject, html };
  
  // Try Resend API first (bypasses DigitalOcean SMTP blocking)
  if (process.env.RESEND_API_KEY) {
    try {
      logEmail('INFO', `Resend API attempt to: ${to}`);
      return await sendEmailViaResend(emailData);
    } catch (error) {
      logEmail('ERROR', 'Resend API failed, trying SMTP fallback:', error.message);
    }
  } else {
    logEmail('INFO', 'Resend API key not configured, using SMTP...');
  }

  // Fallback to SMTP (may fail on DigitalOcean due to port blocking)
  try {
    logEmail('INFO', `SMTP fallback attempt to: ${to}`);
    return await sendEmailViaSMTP(emailData);
  } catch (error) {
    logEmail('ERROR', 'All email methods failed:', error.message);
    return false;
  }
};

// Test function
exports.testEmailConfig = async () => {
  console.log('Testing email configuration...');
  
  const testEmail = {
    to: 'nik.05.jindal@gmail.com',
    subject: 'Email Configuration Test',
    html: `
      <h2>Email Test</h2>
      <p>This email was sent using Resend API (bypasses DigitalOcean SMTP blocking).</p>
      <p>Time: ${new Date().toISOString()}</p>
      <p>Server: DigitalOcean Production</p>
      <p>Method: Resend API + SMTP Fallback</p>
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