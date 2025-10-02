require('dotenv').config();

console.log('🧪 Testing Zoho Mail API Configuration');
console.log('=====================================');
console.log('');

// Check environment variables
console.log('📋 Environment Variables Check:');
console.log('--------------------------------');
const zohoClientId = process.env.ZOHO_CLIENT_ID;
const zohoClientSecret = process.env.ZOHO_CLIENT_SECRET;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

console.log(`ZOHO_CLIENT_ID: ${zohoClientId ? `${zohoClientId.substring(0, 10)}***` : 'NOT SET'}`);
console.log(`ZOHO_CLIENT_SECRET: ${zohoClientSecret ? `***${zohoClientSecret.slice(-4)}` : 'NOT SET'}`);
console.log(`EMAIL_USER: ${emailUser || 'NOT SET'}`);
console.log(`EMAIL_PASS: ${emailPass ? `***${emailPass.slice(-4)}` : 'NOT SET'}`);
console.log('');

// Check if API credentials are configured
const isApiConfigured = zohoClientId && zohoClientSecret;
const isSmtpConfigured = emailUser && emailPass;

console.log('🔍 Configuration Status:');
console.log('------------------------');
console.log(`Zoho Mail API: ${isApiConfigured ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}`);
console.log(`SMTP Fallback: ${isSmtpConfigured ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}`);
console.log('');

if (!isApiConfigured) {
  console.log('🚨 Zoho Mail API not configured!');
  console.log('');
  console.log('📋 To set up Zoho Mail API:');
  console.log('1. Go to https://api-console.zoho.com/');
  console.log('2. Sign in with info@carsaloon.com.au');
  console.log('3. Create a new "Server-based Application"');
  console.log('4. Add scopes: ZohoMail.messages.CREATE');
  console.log('5. Get Client ID and Client Secret');
  console.log('6. Add to .env file:');
  console.log('   ZOHO_CLIENT_ID=your_client_id_here');
  console.log('   ZOHO_CLIENT_SECRET=your_client_secret_here');
  console.log('');
  console.log('💡 Benefits of Zoho Mail API:');
  console.log('- Bypasses DigitalOcean SMTP blocking');
  console.log('- No connection timeout issues');
  console.log('- Faster and more reliable');
  console.log('- Free to use');
  console.log('');
}

if (!isSmtpConfigured) {
  console.log('⚠️  SMTP fallback not configured!');
  console.log('This means if API fails, emails will fail completely.');
  console.log('');
}

// Test email sending
if (isApiConfigured || isSmtpConfigured) {
  console.log('🧪 Testing email sending...');
  console.log('');
  
  const { sendEmail } = require('./src/utils/sendemail');
  
  sendEmail({
    to: 'nik.05.jindal@gmail.com',
    subject: 'Zoho Mail API Test',
    html: `
      <h2>Zoho Mail API Test</h2>
      <p>This email tests the Zoho Mail API configuration.</p>
      <p>Time: ${new Date().toISOString()}</p>
      <p>Method: ${isApiConfigured ? 'Zoho Mail API' : 'SMTP Fallback'}</p>
      <p>Server: ${process.env.NODE_ENV || 'Development'}</p>
    `
  }).then(result => {
    if (result) {
      console.log('✅ Email test successful!');
      console.log('📬 Check nik.05.jindal@gmail.com for the test email.');
    } else {
      console.log('❌ Email test failed');
    }
  }).catch(error => {
    console.log('❌ Email test error:', error.message);
  });
} else {
  console.log('❌ Cannot test email - no configuration available');
  console.log('');
  console.log('🔧 Please configure either:');
  console.log('1. Zoho Mail API (recommended)');
  console.log('2. SMTP fallback (current method)');
}
