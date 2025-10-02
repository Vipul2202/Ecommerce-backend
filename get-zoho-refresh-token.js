#!/usr/bin/env node

/**
 * Zoho OAuth Refresh Token Generator
 * 
 * This script helps you exchange your authorization code for a refresh token.
 * Run this ONCE during initial setup.
 * 
 * Usage:
 *   node get-zoho-refresh-token.js
 */

const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function getRefreshToken() {
  console.log('\n🔑 Zoho Mail API - Refresh Token Generator');
  console.log('==========================================\n');
  
  // Get user input
  console.log('Please provide the following information:\n');
  
  const clientId = await question('1️⃣  Enter your Zoho Client ID: ');
  if (!clientId.trim()) {
    console.error('❌ Client ID is required!');
    rl.close();
    process.exit(1);
  }
  
  const clientSecret = await question('2️⃣  Enter your Zoho Client Secret: ');
  if (!clientSecret.trim()) {
    console.error('❌ Client Secret is required!');
    rl.close();
    process.exit(1);
  }

  const defaultAccountsBase = 'https://accounts.zoho.com';
  const accountsBaseInput = await question(`3️⃣  Zoho Accounts base [press Enter for ${defaultAccountsBase} | examples: https://accounts.zoho.com.au, https://accounts.zoho.eu]: `);
  const accountsBase = (accountsBaseInput.trim() || defaultAccountsBase).replace(/\/$/, '');

  const defaultRedirectUri = 'http://localhost:3000/oauth/callback';
  const redirectUriInput = await question(`4️⃣  Redirect URI [press Enter for ${defaultRedirectUri} | must match the one in Zoho client]: `);
  const redirectUri = (redirectUriInput.trim() || defaultRedirectUri);
  
  console.log('\n📝 Now, get your authorization code:');
  console.log('\n   Visit this URL in your browser:');
  const scope = 'ZohoMail.messages.CREATE,ZohoMail.accounts.READ';
  const authUrl = `${accountsBase}/oauth/v2/auth?scope=${encodeURIComponent(scope)}&client_id=${encodeURIComponent(clientId.trim())}&response_type=code&access_type=offline&redirect_uri=${encodeURIComponent(redirectUri)}&prompt=consent`;
  console.log(`   ${authUrl}\n`);
  console.log('   After authorizing, you\'ll be redirected to a URL with a "code" parameter.');
  console.log('   Copy the code value from the URL.\n');
  console.log('   ⚠️  WARNING: The code expires in 60 seconds!\n');
  
  const authCode = await question('5️⃣  Enter your Authorization Code: ');
  if (!authCode.trim()) {
    console.error('❌ Authorization code is required!');
    rl.close();
    process.exit(1);
  }
  
  console.log('\n🔄 Exchanging authorization code for refresh token...\n');
  
  // Exchange code for tokens
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId.trim(),
    client_secret: clientSecret.trim(),
    redirect_uri: redirectUri,
    code: authCode.trim()
  });
  
  const response = await axios.post(`${accountsBase}/oauth/v2/token`, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }).catch((error) => {
    console.error('❌ Failed to get refresh token:');
    console.error('   Status:', error.response?.status);
    if (error.response?.data) {
      try {
        if (typeof error.response.data === 'string') {
          console.error('   Response Body (truncated):', error.response.data.slice(0, 500));
        } else {
          console.error('   Response JSON:', JSON.stringify(error.response.data, null, 2));
        }
      } catch (_) {}
    }
    console.error('   Error:', error.response?.data?.error);
    console.error('   Description:', error.response?.data?.error_description);
    console.error('   Hint: Ensure redirect URI EXACTLY matches your Zoho OAuth client, and the accounts region is correct.');
    rl.close();
    process.exit(1);
  });
  
  const { access_token, refresh_token, expires_in } = response.data || {};
  
  if (!refresh_token) {
    console.error('❌ No refresh token received!');
    console.error('   Response:', JSON.stringify(response.data, null, 2));
    rl.close();
    process.exit(1);
  }
  
  console.log('✅ Success! Here are your tokens:\n');
  console.log('━'.repeat(80));
  console.log('ACCESS TOKEN (expires in', expires_in, 'seconds):');
  console.log(access_token);
  console.log('');
  console.log('REFRESH TOKEN (save this in your .env file):');
  console.log(refresh_token);
  console.log('━'.repeat(80));
  console.log('');
  console.log('📝 Add this to your .env file:\n');
  console.log(`ZOHO_CLIENT_ID=${clientId.trim()}`);
  console.log(`ZOHO_CLIENT_SECRET=${clientSecret.trim()}`);
  console.log(`ZOHO_REFRESH_TOKEN=${refresh_token}`);
  console.log(`ZOHO_ACCOUNTS_BASE=${accountsBase}`);
  console.log(`ZOHO_API_BASE=https://mail.zoho.com/api`);
  console.log(`EMAIL_USER=info@carsaloon.com.au`);
  console.log(`ADMIN_EMAIL=nik.05.jindal@gmail.com`);
  console.log('');
  console.log('✅ Setup complete! Run "node test-zoho-mail.js" to test your configuration.');
  console.log('');
  rl.close();
}

getRefreshToken();

