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

// Get Zoho Mail API access token using refresh_token (Authorization Code flow)
const getZohoAccessToken = async () => {
  const accountsBase = process.env.ZOHO_ACCOUNTS_BASE || 'https://accounts.zoho.com';
  const tokenUrl = `${accountsBase}/oauth/v2/token`;

  // Validate required env
  if (!process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET || !process.env.ZOHO_REFRESH_TOKEN) {
    logEmail('ERROR', 'Zoho OAuth env missing. Need ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN');
    throw new Error('Zoho OAuth env missing');
  }

  logEmail('INFO', 'Refreshing Zoho access token...');

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    refresh_token: process.env.ZOHO_REFRESH_TOKEN,
  });

  let response;
  try {
    response = await axios.post(tokenUrl, params).catch((error) => { throw error; });
  } catch (error) {
    logEmail('ERROR', 'Failed to refresh Zoho access token:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
  }

  const accessToken = response?.data?.access_token;
  if (!accessToken) {
    logEmail('ERROR', 'Zoho token response missing access_token', response?.data);
    throw new Error('Zoho token response missing access_token');
  }

  logEmail('SUCCESS', 'Zoho access token obtained');
  return accessToken;
};

// Derive region-aware Zoho Mail API base
const getZohoApiBase = () => {
  // If explicitly provided, use it
  if (process.env.ZOHO_API_BASE) return process.env.ZOHO_API_BASE.replace(/\/$/, '');
  // Derive from accounts base (supports AU/EU/IN)
  const accountsBase = (process.env.ZOHO_ACCOUNTS_BASE || 'https://accounts.zoho.com').toLowerCase();
  if (accountsBase.includes('com.au')) return 'https://mail.zoho.com.au/api';
  if (accountsBase.includes('zoho.eu')) return 'https://mail.zoho.eu/api';
  if (accountsBase.includes('zoho.in')) return 'https://mail.zoho.in/api';
  return 'https://mail.zoho.com/api';
};

// Get primary accountId for the configured mailbox
const getZohoAccountId = async (accessToken) => {
  const apiBase = getZohoApiBase();
  const url = `${apiBase}/accounts`;
  const response = await axios.get(url, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` }
  }).catch((error) => { throw error; });
  const accounts = response?.data?.data || [];
  const fromAddress = (process.env.EMAIL_USER || '').toLowerCase();
  // Prefer exact match to fromAddress, else default account, else first
  const exact = accounts.find(a => (a?.emailAddress || '').toLowerCase() === fromAddress);
  if (exact?.accountId) return exact.accountId;
  const def = accounts.find(a => a?.isDefault === true) || accounts[0];
  return def?.accountId;
};

// Send email using Zoho Mail API
const sendEmailViaZohoAPI = async (emailData) => {
  logEmail('INFO', 'Sending email via Zoho Mail API...');
  const apiBase = getZohoApiBase();

  const accessToken = await getZohoAccessToken().catch((error) => {
    logEmail('ERROR', 'Failed to obtain access token:', { message: error.message, status: error.response?.status });
    throw error;
  });

  const accountId = await getZohoAccountId(accessToken).catch((error) => {
    logEmail('ERROR', 'Failed to resolve Zoho accountId:', { message: error.message, status: error.response?.status, data: error.response?.data });
    throw error;
  });

  if (!accountId) {
    logEmail('ERROR', 'No Zoho accountId found for the configured email');
    throw new Error('Zoho accountId not found');
  }

  const apiPayload = {
    fromAddress: process.env.EMAIL_USER || 'info@carsaloon.com.au',
    toAddress: emailData.to,
    subject: emailData.subject,
    content: emailData.html,
    mailFormat: 'html'
  };

  const url = `${apiBase}/accounts/${accountId}/messages`;
  const response = await axios.post(url, apiPayload, {
    headers: {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json'
    }
  }).catch((error) => {
    logEmail('ERROR', 'Zoho messages API call failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
  });

  logEmail('SUCCESS', 'Email sent successfully via Zoho API:', {
    messageId: response.data.data?.messageId,
    status: response.status
  });
  
  return true;
};

// SMTP path intentionally removed per deployment policy (DigitalOcean blocks SMTP). Using Zoho API / Resend only.

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
  
  // Prefer Zoho Mail API when refresh_token is configured (no SMTP, DO-friendly)
  if (process.env.ZOHO_REFRESH_TOKEN && process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET) {
    try {
      logEmail('INFO', `Zoho Mail API attempt to: ${to}`);
      return await sendEmailViaZohoAPI(emailData);
    } catch (error) {
      logEmail('ERROR', 'Zoho Mail API failed, checking Resend next:', error.message);
    }
  }

  // Resend API next (also DO-friendly)
  if (process.env.RESEND_API_KEY && resend) {
    try {
      logEmail('INFO', `Resend API attempt to: ${to}`);
      return await sendEmailViaResend(emailData);
    } catch (error) {
      logEmail('ERROR', 'Resend API failed, trying SMTP fallback:', error.message);
    }
  } else {
    logEmail('INFO', 'Resend not configured');
  }

  // No SMTP fallback (blocked on DigitalOcean). All DO-friendly methods failed.
  logEmail('ERROR', 'All DO-friendly email methods failed (Zoho API / Resend)');
  return false;
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