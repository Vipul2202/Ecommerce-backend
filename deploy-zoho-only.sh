#!/bin/bash

echo "🚀 Deploying Zoho Mail Only Configuration to Production"
echo "========================================================"

# Navigate to backend directory
cd /home/backends/Ecommerce-backend

echo "📥 Pulling latest changes..."
git pull origin main

echo "📦 Installing dependencies..."
npm install

echo "🔧 Updating .env file with Zoho Mail configuration..."
cat > .env << 'EOF'
MONGODB_URI=mongodb+srv://gaurishankerpromatics:gauri%401234@cluster0.etldgyy.mongodb.net/ecom?retryWrites=true&w=majority

PORT=9006

JWT_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MDE2NzE2MDAsImV4cCI6MTcwMTY3NTIwMH0.V7aBEPz1go0MXDYUmJPKH3lyvENZLJ1pj9TcQ83GmRE
JWT_EXPIRATION_DAY=7
JWT_EXPIRATION_DAY_FOR_REMEMBER_ME=30
USER_FRONTEND_URL=https://carsaloon.com.au/
ADMIN_EMAIL=nik.05.jindal@gmail.com
STORAGE_PATH=public

# Zoho Mail Configuration (Working)
EMAIL_USER=info@carsaloon.com.au
EMAIL_PASS=kSXwtw5siPqP

# Legacy email variables (keeping for compatibility)
EMAIL=info@carsaloon.com.au
APP_PASSWORD=kSXwtw5siPqP
EOF

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
