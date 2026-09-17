#!/bin/bash

echo "🚀 Deploying Zoho Mail Only Configuration to Production"
echo "========================================================"

# Navigate to backend directory
cd /home/backends/Ecommerce-backend

echo "📥 Pulling latest changes..."
git pull origin main

echo "📦 Installing dependencies..."
npm install

echo "🔧 Checking .env file..."
if [ ! -f .env ]; then
  echo "❌ .env not found at $(pwd)/.env"
  echo "   This script no longer writes secrets into .env (they used to be"
  echo "   hardcoded here and got committed to git). Create .env manually on"
  echo "   this server first, with at least: MONGODB_URI, PORT, JWT_SECRET,"
  echo "   JWT_EXPIRATION_DAY, JWT_EXPIRATION_DAY_FOR_REMEMBER_ME,"
  echo "   USER_FRONTEND_URL, ADMIN_EMAIL, STORAGE_PATH, EMAIL_USER,"
  echo "   EMAIL_PASS, EMAIL, APP_PASSWORD (and the ZOHO_* / RESEND_API_KEY"
  echo "   variables used elsewhere)."
  exit 1
fi
echo "✅ .env found, leaving it as-is."

echo "🔄 Restarting server..."
pm2 restart server

echo "⏳ Waiting for server to start..."
sleep 5

echo "📊 Checking server logs..."
pm2 logs server --lines 10

echo "✅ Deployment complete!"
echo ""
echo "🧪 To test email functionality:"
echo "   node send-test-email.js"
echo ""
echo "📧 Email Configuration:"
echo "   FROM: info@carsaloon.com.au"
echo "   TO ADMIN: nik.05.jindal@gmail.com"
echo "   PROVIDER: Zoho Mail SMTP"
