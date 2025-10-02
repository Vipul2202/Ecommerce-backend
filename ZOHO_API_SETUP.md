# Zoho Mail API Setup Guide

## 🎯 Why Use Zoho Mail API?

- ✅ **Free** (unlike SendGrid)
- ✅ **Bypasses DigitalOcean SMTP blocking**
- ✅ **More reliable** than SMTP on cloud servers
- ✅ **No port restrictions**
- ✅ **Better error handling**

## 📋 Step 1: Create Zoho Developer Account

1. Go to [Zoho Developer Console](https://api-console.zoho.com/)
2. Sign in with your Zoho account (`info@carsaloon.com.au`)
3. Click **"Add Client"**
4. Choose **"Server-based Applications"**

## 🔧 Step 2: Configure OAuth Application

**Application Details:**
- **Client Name:** `Car Salon Backend`
- **Homepage URL:** `https://carsaloon.com.au`
- **Authorized Redirect URIs:** `https://carsaloon.com.au/callback`

**Scopes Required:**
- `ZohoMail.messages.CREATE`
- `ZohoMail.accounts.READ`

## 🔑 Step 3: Get API Credentials

After creating the application, you'll get:
- **Client ID:** `1000.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Client Secret:** `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## 📝 Step 4: Update Environment Variables

Add these to your `.env` file:

```bash
# Zoho Mail API Configuration
ZOHO_CLIENT_ID=your_client_id_here
ZOHO_CLIENT_SECRET=your_client_secret_here

# Existing Zoho Mail Configuration (for fallback)
EMAIL_USER=info@carsaloon.com.au
EMAIL_PASS=kSXwtw5siPqP
```

## 🧪 Step 5: Test Configuration

```bash
# Test the API configuration
node send-test-email.js
```

## 📊 How It Works

**Primary Method (API):**
1. Get OAuth token from Zoho
2. Send email via Zoho Mail API
3. No SMTP ports needed

**Fallback Method (SMTP):**
1. If API fails, fallback to SMTP
2. Uses existing SMTP configuration
3. Handles DigitalOcean restrictions

## 🎯 Benefits

- **No more connection timeouts**
- **No more SMTP port blocking issues**
- **Faster email delivery**
- **Better error messages**
- **Free to use**

## 🔧 Troubleshooting

**If API fails:**
- Check Client ID and Secret
- Verify OAuth scopes
- Ensure redirect URI is correct

**If SMTP fallback fails:**
- Check EMAIL_USER and EMAIL_PASS
- Verify Zoho App Password

## 📈 Production Deployment

1. Update `.env` with API credentials
2. Deploy to DigitalOcean
3. Test email functionality
4. Monitor logs for API vs SMTP usage
