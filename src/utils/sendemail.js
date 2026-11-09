const axios = require('axios');
const { Resend } = require('resend');
const EmailFailure = require('../models/emailFailure');

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
  logEmail('INFO', 'Sending email via Resend API...');
  
  const { data, error } = await resend.emails.send({
    from: 'Car Salon <onboarding@resend.dev>', // You can change this to your verified domain
    to: [emailData.to],
    subject: emailData.subject,
    html: emailData.html,
  }).catch((error) => {
    logEmail('ERROR', 'Resend API email send failed:', {
      message: error.message,
      stack: error.stack
    });
    throw error;
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
};

// In-memory cache so we don't hit Zoho's OAuth endpoint on every single
// email. Zoho access tokens are valid for ~1 hour; we refresh a bit early
// to be safe. This matters because one booking confirmation can trigger
// 3 emails (customer, admin, location) in quick succession — without
// caching that was 3 separate token refreshes per confirmation, adding
// latency and risking Zoho's own rate limits on the token endpoint.
let cachedZohoToken = null;
let cachedZohoTokenExpiresAt = 0; // epoch ms

// Get Zoho Mail API access token using refresh_token (Authorization Code flow)
const getZohoAccessToken = async () => {
  const accountsBase = process.env.ZOHO_ACCOUNTS_BASE || 'https://accounts.zoho.com';
  const tokenUrl = `${accountsBase}/oauth/v2/token`;

  // Validate required env
  if (!process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET || !process.env.ZOHO_REFRESH_TOKEN) {
    logEmail('ERROR', 'Zoho OAuth env missing. Need ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN');
    throw new Error('Zoho OAuth env missing');
  }

  // Serve from cache if it's still valid (60s safety buffer)
  if (cachedZohoToken && Date.now() < cachedZohoTokenExpiresAt - 60000) {
    logEmail('INFO', 'Using cached Zoho access token');
    return cachedZohoToken;
  }

  logEmail('INFO', 'Refreshing Zoho access token...');

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    refresh_token: process.env.ZOHO_REFRESH_TOKEN,
  });

  const response = await axios.post(tokenUrl, params).catch((error) => {
    logEmail('ERROR', 'Failed to refresh Zoho access token:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
  });

  const accessToken = response?.data?.access_token;
  if (!accessToken) {
    logEmail('ERROR', 'Zoho token response missing access_token', response?.data);
    throw new Error('Zoho token response missing access_token');
  }

  // Zoho typically returns expires_in in seconds (usually 3600). Fall back
  // to a conservative 55 minutes if it's ever missing.
  const expiresInMs = (response?.data?.expires_in ? response.data.expires_in * 1000 : 55 * 60 * 1000);
  cachedZohoToken = accessToken;
  cachedZohoTokenExpiresAt = Date.now() + expiresInMs;

  logEmail('SUCCESS', 'Zoho access token obtained');
  return accessToken;
};

// Derive region-aware Zoho Mail API base
const getZohoApiBase = () => {
  // If explicitly provided, use it
  if (process.env.ZOHO_API_BASE) return process.env.ZOHO_API_BASE.replace(/\/$/, '');
  // Derive from accounts base (supports AU/EU/IN)
  const accountsBase = String(process.env.ZOHO_ACCOUNTS_BASE || 'https://accounts.zoho.com').toLowerCase();
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
  }).catch((error) => {
    logEmail('ERROR', 'Failed to get Zoho account ID:', {
      message: error.message,
      status: error.response?.status
    });
    throw error;
  });
  
  const accounts = response?.data?.data || [];
  const fromAddress = String(process.env.EMAIL_USER || '').toLowerCase();
  // Prefer exact match to fromAddress, else default account, else first
  const exact = accounts.find(a => String(a?.emailAddress || '').toLowerCase() === fromAddress);
  if (exact?.accountId) return exact.accountId;
  const def = accounts.find(a => a?.isDefault === true) || accounts[0];
  return def?.accountId;
};

// Send email using Zoho Mail API with smart fallbacks
const sendEmailViaZohoAPI = async (emailData) => {
  logEmail('INFO', 'Sending email via Zoho Mail API...');

  const accessToken = await getZohoAccessToken().catch((error) => {
    logEmail('ERROR', 'Failed to obtain access token:', { message: error.message, status: error.response?.status });
    throw error;
  });

  const candidateBases = Array.from(new Set([
    getZohoApiBase(),
    'https://mail.zoho.com/api',
    'https://mail.zoho.com.au/api'
  ])).map(b => b.replace(/\/$/, ''));

  const apiPayload = {
    fromAddress: process.env.EMAIL_USER || 'info@carsaloon.com.au',
    toAddress: emailData.to,
    subject: emailData.subject,
    content: emailData.html,
    mailFormat: 'html'
  };

  // Try posting to /messages directly first (works in some orgs)
  for (const base of candidateBases) {
    const url = `${base}/messages`;
    const response = await axios.post(url, apiPayload, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }).catch((error) => {
      const code = error.response?.data?.data?.errorCode || error.response?.status;
      logEmail('INFO', `Direct /messages failed on ${base}:`, { code, desc: error.response?.data?.status?.description });
      return null; // Return null to indicate failure, continue to next base
    });
    
    if (response) {
      logEmail('SUCCESS', `Email sent via Zoho API at ${base}/messages:`, {
        messageId: response.data.data?.messageId,
        status: response.status
      });
      return true;
    }
  }

  // If /messages not allowed, resolve accountId (requires ZohoMail.accounts.READ)
  let accountId;
  for (const base of candidateBases) {
    const urlAcc = `${base}/accounts`;
    const resAcc = await axios.get(urlAcc, { 
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } 
    }).catch((error) => {
      logEmail('INFO', 'Fetching accounts failed (scope ZohoMail.accounts.READ may be required):', {
        status: error.response?.status, code: error.response?.data?.data?.errorCode
      });
      return null;
    });
    
    if (resAcc) {
      const accounts = resAcc?.data?.data || [];
      const fromLower = String(process.env.EMAIL_USER || '').toLowerCase();
      const exact = accounts.find(a => String(a?.emailAddress || '').toLowerCase() === fromLower);
      const chosen = exact || accounts.find(a => a?.isDefault) || accounts[0];
      if (chosen?.accountId) { 
        accountId = chosen.accountId; 
        break; 
      }
    }
  }

  if (!accountId) {
    logEmail('ERROR', 'Could not resolve Zoho accountId. Add scope ZohoMail.accounts.READ to your token.');
    throw new Error('Zoho accountId not resolved');
  }

  for (const base of candidateBases) {
    const url = `${base}/accounts/${accountId}/messages`;
    const response = await axios.post(url, apiPayload, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }).catch((error) => {
      logEmail('INFO', `Account-scoped send failed on ${base}:`, {
        status: error.response?.status, code: error.response?.data?.data?.errorCode
      });
      return null;
    });
    
    if (response) {
      logEmail('SUCCESS', `Email sent via Zoho API at ${url}:`, {
        messageId: response.data.data?.messageId,
        status: response.status
      });
      return true;
    }
  }

  // Throw (not return false) so callers that retry/fall-back on failure -
  // see withRetries() and sendEmail() below - actually get to do that.
  // A plain `false` here used to look like "nothing to retry, done",
  // silently skipping the Resend fallback.
  logEmail('ERROR', 'All Zoho API attempts failed');
  throw new Error('All Zoho API attempts failed');
};

// SMTP path intentionally removed per deployment policy (DigitalOcean blocks SMTP). Using Zoho API / Resend only.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retries a flaky operation a few times before giving up, so a brief
// hiccup (e.g. Zoho's API failing to resolve an account for a moment,
// which is what silently dropped a real owner notification) doesn't
// cost an email outright. Waits a bit longer between each retry.
const withRetries = async (fn, { attempts = 3, delayMs = 1500, label = 'operation' } = {}) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      logEmail('ERROR', `${label} failed (attempt ${attempt}/${attempts}):`, { message: error.message });
      if (attempt < attempts) await sleep(delayMs * attempt);
    }
  }
  throw lastError;
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
  let lastError;

  // Prefer Zoho Mail API when refresh_token is configured (no SMTP, DO-friendly)
  if (process.env.ZOHO_REFRESH_TOKEN && process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET) {
    try {
      logEmail('INFO', `Zoho Mail API attempt to: ${to}`);
      return await withRetries(() => sendEmailViaZohoAPI(emailData), {
        attempts: 3,
        delayMs: 1500,
        label: `Zoho Mail API (to: ${to})`,
      });
    } catch (error) {
      lastError = error;
      logEmail('ERROR', 'Zoho Mail API failed after retries, checking Resend next:', error.message);
    }
  }

  // Resend API next (also DO-friendly)
  if (process.env.RESEND_API_KEY && resend) {
    try {
      logEmail('INFO', `Resend API attempt to: ${to}`);
      return await sendEmailViaResend(emailData);
    } catch (error) {
      lastError = error;
      logEmail('ERROR', 'Resend API failed, trying SMTP fallback:', error.message);
    }
  } else {
    logEmail('INFO', 'Resend not configured');
  }

  // No SMTP fallback (blocked on DigitalOcean). All DO-friendly methods failed.
  logEmail('ERROR', 'All DO-friendly email methods failed (Zoho API / Resend)');

  // Record it so this shows up in the owner panel instead of only this
  // console log - best-effort: a DB hiccup here must never make an
  // already-failed send throw and break the caller's flow further.
  try {
    await EmailFailure.create({
      to,
      subject,
      html,
      error: lastError?.message || 'All email send methods failed',
    });
  } catch (logError) {
    logEmail('ERROR', 'Failed to record email failure in DB:', logError.message);
  }

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