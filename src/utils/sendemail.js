const axios = require('axios');

// Zoho Mail API Configuration
const ZOHO_API_BASE_URL = 'https://mail.zoho.com/api';

// Enhanced logging function
const logEmail = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [EMAIL-${level}] ${message}`);
  if (data) {
    console.log(`[${timestamp}] [EMAIL-${level}] Data:`, JSON.stringify(data, null, 2));
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

// Fallback SMTP function (for when API fails)
const sendEmailViaSMTP = async (emailData) => {
  const nodemailer = require('nodemailer');
  
  logEmail('INFO', 'Falling back to SMTP...');
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com.au',
    port: 465,
    secure: true,
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
  });

  try {
    const info = await transporter.sendMail({
      from: `Car Salon <${process.env.EMAIL_USER || 'info@carsaloon.com.au'}>`,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
    });

    logEmail('SUCCESS', 'SMTP fallback email sent:', info.messageId);
    return true;
    
  } catch (error) {
    logEmail('ERROR', 'SMTP fallback failed:', error.message);
    throw error;
  }
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
  
  // Try Zoho Mail API first (bypasses DigitalOcean SMTP blocking)
  if (process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET) {
    try {
      logEmail('INFO', `Zoho Mail API attempt to: ${to}`);
      return await sendEmailViaZohoAPI(emailData);
    } catch (error) {
      logEmail('ERROR', 'Zoho API failed, trying SMTP fallback:', error.message);
    }
  } else {
    logEmail('INFO', 'Zoho API credentials not configured, using SMTP...');
  }

  // Fallback to SMTP
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
  console.log('Testing Zoho Mail API configuration...');
  
  const testEmail = {
    to: 'nik.05.jindal@gmail.com',
    subject: 'Zoho Mail API Test',
    html: `
      <h2>Zoho Mail API Test</h2>
      <p>This email was sent using Zoho Mail API (bypassing SMTP).</p>
      <p>Time: ${new Date().toISOString()}</p>
      <p>Server: DigitalOcean Production</p>
      <p>Method: Zoho Mail API</p>
    `
  };

  const result = await exports.sendEmail(testEmail);
  
  if (result) {
    console.log('✅ Zoho Mail API test successful!');
  } else {
    console.log('❌ Zoho Mail API test failed');
  }
  
  return result;
};

module.exports = exports;