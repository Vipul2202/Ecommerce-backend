# Email Configuration Guide for DigitalOcean Server

## 🚨 DigitalOcean SMTP Restrictions

**DigitalOcean blocks SMTP ports (25, 465, 587) by default** to prevent spam. This causes connection timeouts.

## ✅ Recommended Solutions (In Order of Preference)

### Option 1: SendGrid (BEST - No SMTP Required)
```bash
# Install SendGrid
npm install @sendgrid/mail

# Add to .env file
SENDGRID_API_KEY=your_sendgrid_api_key_here
EMAIL_USER=your_email@domain.com
ADMIN_EMAIL=nik.05.jindal@gmail.com
```

**Benefits:**
- ✅ No SMTP port restrictions
- ✅ High deliverability
- ✅ Free tier: 100 emails/day
- ✅ Reliable on DigitalOcean

### Option 2: Zoho Mail (Good Alternative)
```bash
# Add to .env file
EMAIL_USER=your_email@zoho.com
EMAIL_PASS=your_zoho_password
ADMIN_EMAIL=nik.05.jindal@gmail.com
```

**Zoho SMTP Settings:**
- **Host:** smtp.zoho.com
- **Port:** 465 (SSL) or 2525 (STARTTLS)
- **Security:** SSL/TLS

### Option 3: Request SMTP Port Unblocking
Contact DigitalOcean support to request unblocking of SMTP ports (not guaranteed).

## 🔧 Current Implementation

The system now tries email methods in this order:
1. **SendGrid API** (if API key configured)
2. **Zoho Mail SMTP** (port 465)
3. **Zoho Mail Alternative** (port 2525)
4. **Gmail SMTP** (fallback)

## 🧪 Testing Email Configuration

### Test All Email Methods:
```bash
node -e "
const { testEmailConfig } = require('./src/utils/sendemail');
testEmailConfig();
"
```

### Test Specific Method:
```bash
# Test SendGrid only
node -e "
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
console.log('SendGrid configured:', !!process.env.SENDGRID_API_KEY);
"
```

## 📧 Environment Variables

### Required Variables:
```bash
# Email Configuration
EMAIL_USER=your_email@domain.com
EMAIL_PASS=your_app_password
ADMIN_EMAIL=nik.05.jindal@gmail.com

# SendGrid (Recommended)
SENDGRID_API_KEY=SG.your_api_key_here
```

### Optional Variables:
```bash
# Legacy compatibility
EMAIL=your_email@domain.com
APP_PASSWORD=your_app_password
```

## 🚀 Quick Setup for SendGrid

1. **Sign up at SendGrid** (free tier available)
2. **Create API Key** in SendGrid dashboard
3. **Add to .env file:**
   ```bash
   SENDGRID_API_KEY=SG.your_actual_api_key_here
   ```
4. **Test configuration:**
   ```bash
   node -e "require('./src/utils/sendemail').testEmailConfig()"
   ```

## 🔍 Troubleshooting

### Connection Timeout Errors:
- ✅ Use SendGrid (bypasses SMTP restrictions)
- ✅ Try Zoho Mail with port 2525
- ✅ Contact DigitalOcean support for port unblocking

### Authentication Errors:
- ✅ Use app-specific passwords
- ✅ Enable 2FA and generate app password
- ✅ Verify email credentials

### Delivery Issues:
- ✅ Check spam folders
- ✅ Verify sender domain reputation
- ✅ Use SendGrid for better deliverability
