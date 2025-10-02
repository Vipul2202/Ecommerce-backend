# Email Configuration Guide for DigitalOcean Server

## Environment Variables Needed

Add these to your .env file on the DigitalOcean server:

```
# Email Configuration
EMAIL_USER=promatics.abhishek5@gmail.com
EMAIL_PASS=haji ykpi iyxa bkvp
ADMIN_EMAIL=nik.05.jindal@gmail.com
```

## Alternative Email Solutions

If Gmail SMTP continues to timeout, consider these alternatives:

### Option 1: Use SendGrid (Recommended)
```bash
npm install @sendgrid/mail
```

### Option 2: Use Mailgun
```bash
npm install mailgun-js
```

### Option 3: Use AWS SES
```bash
npm install aws-sdk
```

## Current Fixes Applied

1. **Enhanced SMTP Configuration**: Added multiple connection options
2. **Retry Logic**: 3 attempts with 2-second delays
3. **Better Error Handling**: Non-blocking email failures
4. **Connection Verification**: Tests connection on startup

## Testing Email

Run this command to test email configuration:
```bash
node -e "
const transporter = require('./src/config/mailier');
transporter.verify((error, success) => {
  if (error) console.log('Error:', error);
  else console.log('Email ready:', success);
});
"
```
