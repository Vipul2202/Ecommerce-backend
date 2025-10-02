const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'promatics.abhishek5@gmail.com', 
    pass: process.env.EMAIL_PASS || 'haji ykpi iyxa bkvp',   
  },
  // Add timeout and connection options for production
  connectionTimeout: 60000, // 60 seconds
  greetingTimeout: 30000,   // 30 seconds
  socketTimeout: 60000,     // 60 seconds
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 20000,
  rateLimit: 5
});

module.exports = transporter;
