require('dotenv').config();

console.log('🔍 EMAIL SYSTEM DIAGNOSTIC REPORT');
console.log('=====================================');
console.log('');

// Check environment variables
console.log('📋 Environment Variables Check:');
console.log('--------------------------------');
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const adminEmail = process.env.ADMIN_EMAIL;
const sendgridKey = process.env.SENDGRID_API_KEY;

console.log(`EMAIL_USER: ${emailUser ? `${emailUser.substring(0, 3)}***@${emailUser.split('@')[1]}` : 'NOT SET'}`);
console.log(`EMAIL_PASS: ${emailPass ? `***${emailPass.slice(-4)}` : 'NOT SET'}`);
console.log(`ADMIN_EMAIL: ${adminEmail || 'NOT SET'}`);
console.log(`SENDGRID_API_KEY: ${sendgridKey ? (sendgridKey === 'your_sendgrid_api_key_here' ? 'PLACEHOLDER VALUE' : 'CONFIGURED') : 'NOT SET'}`);
console.log('');

// Check if credentials are placeholder values
const isPlaceholderUser = emailUser === 'your_actual_zoho_email@zoho.com';
const isPlaceholderPass = emailPass === 'your_actual_zoho_app_password';
const isPlaceholderSendgrid = sendgridKey === 'your_sendgrid_api_key_here';

console.log('🚨 ISSUE ANALYSIS:');
console.log('------------------');
if (isPlaceholderUser) {
  console.log('❌ EMAIL_USER is still a placeholder value');
}
if (isPlaceholderPass) {
  console.log('❌ EMAIL_PASS is still a placeholder value');
}
if (isPlaceholderSendgrid) {
  console.log('❌ SENDGRID_API_KEY is still a placeholder value');
}

if (isPlaceholderUser || isPlaceholderPass || isPlaceholderSendgrid) {
  console.log('');
  console.log('🔧 SOLUTION REQUIRED:');
  console.log('---------------------');
  console.log('You need to update your .env file with REAL credentials:');
  console.log('');
  console.log('1. For Zoho Mail:');
  console.log('   EMAIL_USER=your_real_zoho_email@zoho.com');
  console.log('   EMAIL_PASS=your_real_zoho_app_password');
  console.log('');
  console.log('2. For SendGrid (optional):');
  console.log('   SENDGRID_API_KEY=your_real_sendgrid_api_key');
  console.log('');
  console.log('3. Get Zoho App Password:');
  console.log('   - Log into Zoho Mail');
  console.log('   - Go to Settings → Security → App Passwords');
  console.log('   - Generate new App Password');
  console.log('   - Use this password (NOT your regular password)');
} else {
  console.log('✅ All credentials appear to be configured');
}

console.log('');
console.log('📊 EMAIL SYSTEM STATUS:');
console.log('------------------------');
console.log('Current Configuration:');
console.log(`- Primary: ${sendgridKey && !isPlaceholderSendgrid ? 'SendGrid API' : 'Zoho Mail SMTP'}`);
console.log(`- Fallback: Zoho Mail SMTP (smtp.zoho.com.au)`);
console.log(`- Ports: 465 (SSL), 587 (STARTTLS), 2525 (Alternative)`);
console.log('');

console.log('🎯 NEXT STEPS:');
console.log('---------------');
if (isPlaceholderUser || isPlaceholderPass) {
  console.log('1. Update .env file with real Zoho Mail credentials');
  console.log('2. Restart the server: pm2 restart server');
  console.log('3. Test email sending: node send-test-email.js');
  console.log('4. Check server logs for email activity');
} else {
  console.log('1. Test email sending: node send-test-email.js');
  console.log('2. Check server logs for email activity');
  console.log('3. Verify Zoho Mail account settings');
}

console.log('');
console.log('📝 LOG MONITORING:');
console.log('------------------');
console.log('To monitor email logs in real-time:');
console.log('pm2 logs server --lines 50');
console.log('');
console.log('To test email configuration:');
console.log('node send-test-email.js');
console.log('');
console.log('To test Zoho Mail specifically:');
console.log('node test-zoho-mail-detailed.js');
