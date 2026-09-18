#!/usr/bin/env node
/**
 * Validates .env before you restart the server, so a bad manual edit shows
 * up here instead of as "site is down" or "bookings aren't saving" later.
 *
 * Usage (run before every pm2 restart after editing .env):
 *   node check-env.js
 *
 * Exits with a non-zero code and a clear list of what's missing if anything
 * required is absent or empty. Prints nothing and exits 0 if everything
 * required is present.
 */

require('dotenv').config();

const REQUIRED = [
  'MONGODB_URI',
  'JWT_SECRET',
  'PORT',
  'ADMIN_EMAIL',
  'EMAIL_USER',
  'MYAREE_EMAIL',
  'MIDLAND_EMAIL',
  'USER_FRONTEND_URL',
  'ZOHO_CLIENT_ID',
  'ZOHO_CLIENT_SECRET',
  'ZOHO_ACCOUNTS_BASE',
  'ZOHO_REFRESH_TOKEN',
  'ZOHO_CALENDAR_REFRESH_TOKEN',
  'ZOHO_CALENDAR_MYAREE_UID',
  'ZOHO_CALENDAR_MIDLAND_UID',
];

const missing = REQUIRED.filter((key) => !process.env[key] || !process.env[key].trim());

// REMINDER_TEST_EMAIL is only required while REMINDER_TEST_MODE isn't "false"
if (process.env.REMINDER_TEST_MODE !== 'false' && !process.env.REMINDER_TEST_EMAIL) {
  missing.push('REMINDER_TEST_EMAIL (required because REMINDER_TEST_MODE is on)');
}

if (missing.length > 0) {
  console.error('❌ .env is missing required variables — DO NOT restart the server yet:\n');
  missing.forEach((key) => console.error(`   - ${key}`));
  console.error('\nFix .env, then re-run: node check-env.js');
  process.exit(1);
}

console.log('✅ .env looks complete — safe to restart the server.');
process.exit(0);
