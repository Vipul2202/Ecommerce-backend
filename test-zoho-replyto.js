#!/usr/bin/env node
/**
 * One-off test: does Zoho Mail API's send-message endpoint accept a
 * "replyTo" field, or does it reject the whole request?
 *
 * Sends exactly TWO test emails to an address you type in by hand at the
 * confirmation prompt — never a silent fallback to REMINDER_TEST_EMAIL or
 * any other env var, specifically so this can never accidentally email a
 * real customer just because .env happens to point somewhere unsafe right
 * now. Does not touch the database.
 *
 * Usage:
 *   node test-zoho-replyto.js your-test-inbox@example.com
 * (an address is REQUIRED — the script refuses to run without one, and
 * asks you to re-type it to confirm before sending anything)
 */

require('dotenv').config();
const axios = require('axios');
const readline = require('readline');

const TEST_RECIPIENT = process.argv[2];

const confirm = (question) => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(question, (answer) => {
    rl.close();
    resolve(answer);
  });
});

async function run() {
  if (!TEST_RECIPIENT) {
    console.error('Usage: node test-zoho-replyto.js your-test-inbox@example.com');
    console.error('An address is required — this script will NOT fall back to REMINDER_TEST_EMAIL or any other .env value.');
    process.exit(1);
  }
  if (!process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET || !process.env.ZOHO_REFRESH_TOKEN) {
    console.error('Missing ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET / ZOHO_REFRESH_TOKEN in .env');
    process.exit(1);
  }

  console.log(`This will send 2 test emails to: ${TEST_RECIPIENT}`);
  const typedBack = await confirm('Type that exact address again to confirm, or anything else to abort: ');
  if (typedBack.trim().toLowerCase() !== TEST_RECIPIENT.trim().toLowerCase()) {
    console.log('Addresses did not match — aborting, nothing was sent.');
    process.exit(1);
  }

  const accountsBase = process.env.ZOHO_ACCOUNTS_BASE || 'https://accounts.zoho.com';
  const tokenUrl = `${accountsBase}/oauth/v2/token`;

  console.log('1. Getting Zoho access token...');
  const tokenParams = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    refresh_token: process.env.ZOHO_REFRESH_TOKEN,
  });
  const tokenRes = await axios.post(tokenUrl, tokenParams);
  const accessToken = tokenRes?.data?.access_token;
  if (!accessToken) {
    console.error('Failed to get access token:', tokenRes?.data);
    process.exit(1);
  }
  console.log('   Got access token.');

  const apiBase = (() => {
    if (process.env.ZOHO_API_BASE) return process.env.ZOHO_API_BASE.replace(/\/$/, '');
    const base = accountsBase.toLowerCase();
    if (base.includes('com.au')) return 'https://mail.zoho.com.au/api';
    if (base.includes('zoho.eu')) return 'https://mail.zoho.eu/api';
    if (base.includes('zoho.in')) return 'https://mail.zoho.in/api';
    return 'https://mail.zoho.com/api';
  })();

  console.log('2. Resolving Zoho accountId...');
  const accRes = await axios.get(`${apiBase}/accounts`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  }).catch((error) => {
    console.error('Failed to fetch accounts:', error.response?.data || error.message);
    process.exit(1);
  });
  const accounts = accRes?.data?.data || [];
  const fromAddress = process.env.EMAIL_USER || 'info@carsaloon.com.au';
  const chosen = accounts.find(a => String(a?.emailAddress || '').toLowerCase() === fromAddress.toLowerCase())
    || accounts.find(a => a?.isDefault) || accounts[0];
  if (!chosen?.accountId) {
    console.error('Could not resolve an accountId. Raw accounts response:', accounts);
    process.exit(1);
  }
  console.log(`   Using accountId ${chosen.accountId} (${chosen.emailAddress})`);

  const testCases = [
    {
      name: 'replyTo',
      payload: {
        fromAddress,
        toAddress: TEST_RECIPIENT,
        subject: '[TEST] Zoho replyTo field test',
        content: '<p>If this arrived, check the actual "Reply-To" header on the raw email — does it show replyto-test@carsaloon.com.au ?</p>',
        mailFormat: 'html',
        replyTo: 'replyto-test@carsaloon.com.au',
      },
    },
    {
      name: 'replyToAddress',
      payload: {
        fromAddress,
        toAddress: TEST_RECIPIENT,
        subject: '[TEST] Zoho replyToAddress field test',
        content: '<p>If this arrived, check the actual "Reply-To" header on the raw email — does it show replytoaddress-test@carsaloon.com.au ?</p>',
        mailFormat: 'html',
        replyToAddress: 'replytoaddress-test@carsaloon.com.au',
      },
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n3. Trying field name "${testCase.name}"...`);
    const url = `${apiBase}/accounts/${chosen.accountId}/messages`;
    try {
      const res = await axios.post(url, testCase.payload, {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      console.log(`   SUCCESS (HTTP ${res.status}). Response:`, JSON.stringify(res.data, null, 2));
      console.log(`   → Check the email that lands in ${TEST_RECIPIENT} and look at its raw headers for "Reply-To".`);
    } catch (error) {
      console.log(`   FAILED (HTTP ${error.response?.status}). Response:`, JSON.stringify(error.response?.data, null, 2));
    }
  }

  console.log('\nDone. If either field name said SUCCESS, check that test email\'s raw headers (View Original / Show Source in your mail client) to confirm Reply-To actually got set — a 200 OK does not guarantee Zoho honored the field, only that it didn\'t reject the request.');
}

run().catch((error) => {
  console.error('Test script failed:', error.response?.data || error.message);
  process.exit(1);
});
