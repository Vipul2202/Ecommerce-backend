require('dotenv').config();

console.log('🧪 Testing Zoho Mail API Configuration');
console.log('=====================================');
console.log('');

// Check environment variables
console.log('📋 Environment Variables Check:');
console.log('--------------------------------');
const zohoClientId = process.env.ZOHO_CLIENT_ID;
const zohoClientSecret = process.env.ZOHO_CLIENT_SECRET;
const zohoRefreshToken = process.env.ZOHO_REFRESH_TOKEN;
const emailUser = process.env.EMAIL_USER;
const adminEmail = process.env.ADMIN_EMAIL;

console.log(`ZOHO_CLIENT_ID: ${zohoClientId ? `${zohoClientId.substring(0, 10)}...` : '❌ NOT SET'}`);
console.log(`ZOHO_CLIENT_SECRET: ${zohoClientSecret ? `***${zohoClientSecret.slice(-4)}` : '❌ NOT SET'}`);
console.log(`ZOHO_REFRESH_TOKEN: ${zohoRefreshToken ? `***${zohoRefreshToken.slice(-4)}` : '❌ NOT SET'}`);
console.log(`EMAIL_USER: ${emailUser || '❌ NOT SET'}`);
console.log(`ADMIN_EMAIL: ${adminEmail || '❌ NOT SET'}`);
console.log('');

// Check if API credentials are configured
const isZohoConfigured = zohoClientId && zohoClientSecret && zohoRefreshToken;

console.log('🔍 Configuration Status:');
console.log('------------------------');
console.log(`Zoho Mail API: ${isZohoConfigured ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}`);
console.log('');

if (!isZohoConfigured) {
  console.log('🚨 Zoho Mail API not fully configured!');
  console.log('');
  console.log('📋 Missing environment variables:');
  if (!zohoClientId) console.log('   ❌ ZOHO_CLIENT_ID');
  if (!zohoClientSecret) console.log('   ❌ ZOHO_CLIENT_SECRET');
  if (!zohoRefreshToken) console.log('   ❌ ZOHO_REFRESH_TOKEN');
  console.log('');
  console.log('🔧 To set up Zoho Mail API, follow these steps:');
  console.log('');
  console.log('1. Read the complete guide:');
  console.log('   📄 Open: ZOHO_SETUP_COMPLETE_GUIDE.md');
  console.log('');
  console.log('2. Run the setup helper:');
  console.log('   💻 node get-zoho-refresh-token.js');
  console.log('');
  console.log('3. Add the values to your .env file');
  console.log('');
  process.exit(1);
}

// Test email sending
console.log('🧪 Testing email sending...');
console.log('━'.repeat(80));
console.log('');

const { sendEmail } = require('./src/utils/sendemail');

const testEmail = {
  to: adminEmail || 'nik.05.jindal@gmail.com',
  subject: '✅ Zoho Mail API Test - Success!',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; border-radius: 5px; }
        .content { background: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 5px; }
        .success { color: #4CAF50; font-size: 48px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        td:first-child { font-weight: bold; width: 40%; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Email Configuration Test</h1>
          <p>Your Zoho Mail API is working perfectly!</p>
        </div>
        <div class="content">
          <p class="success">✅</p>
          <h2>Test Successful!</h2>
          <p>This email was sent using <strong>Zoho Mail API</strong>, which means:</p>
          <ul>
            <li>✅ No SMTP port blocking on DigitalOcean</li>
            <li>✅ Fast and reliable delivery</li>
            <li>✅ OAuth 2.0 security</li>
            <li>✅ Free to use</li>
          </ul>
          <table>
            <tr>
              <td>Test Time:</td>
              <td>${new Date().toLocaleString()}</td>
            </tr>
            <tr>
              <td>Method:</td>
              <td>Zoho Mail API</td>
            </tr>
            <tr>
              <td>Sender:</td>
              <td>${emailUser}</td>
            </tr>
            <tr>
              <td>Environment:</td>
              <td>${process.env.NODE_ENV || 'Development'}</td>
            </tr>
          </table>
          <p style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-left: 4px solid #4CAF50;">
            <strong>✨ Your booking form emails will now be delivered successfully!</strong>
          </p>
        </div>
      </div>
    </body>
    </html>
  `
};

console.log(`📧 Sending test email to: ${testEmail.to}`);
console.log('');

sendEmail(testEmail)
  .then(result => {
    console.log('');
    console.log('━'.repeat(80));
    if (result) {
      console.log('✅ EMAIL TEST SUCCESSFUL!');
      console.log('');
      console.log(`📬 Check ${testEmail.to} for the test email.`);
      console.log('');
      console.log('🎯 Next Steps:');
      console.log('   1. Deploy these .env variables to your DigitalOcean server');
      console.log('   2. Restart your server (pm2 restart all)');
      console.log('   3. Test your booking form');
      console.log('');
      console.log('✨ Your email system is ready for production!');
    } else {
      console.log('❌ EMAIL TEST FAILED');
      console.log('');
      console.log('📝 Check the error messages above for details.');
      console.log('');
      console.log('💡 Common issues:');
      console.log('   - Invalid refresh token (get a new one)');
      console.log('   - Wrong API base URL for your region');
      console.log('   - Incorrect Client ID or Secret');
    }
    console.log('━'.repeat(80));
    console.log('');
  })
  .catch(error => {
    console.log('');
    console.log('━'.repeat(80));
    console.log('❌ EMAIL TEST ERROR');
    console.log('');
    console.log('Error:', error.message);
    console.log('');
    console.log('📋 Troubleshooting:');
    console.log('   1. Check ZOHO_SETUP_COMPLETE_GUIDE.md');
    console.log('   2. Verify all .env variables are set correctly');
    console.log('   3. Try getting a new refresh token');
    console.log('');
    console.log('Run: node get-zoho-refresh-token.js');
    console.log('━'.repeat(80));
    console.log('');
  });

