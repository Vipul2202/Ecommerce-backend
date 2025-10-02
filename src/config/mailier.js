const nodemailer = require('nodemailer');

// Create multiple transporter configurations for fallback
const createTransporter = () => {
  // Primary configuration with enhanced settings
  const primaryConfig = {
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'promatics.abhishek5@gmail.com', 
      pass: process.env.EMAIL_PASS || 'haji ykpi iyxa bkvp',   
    },
    // Enhanced timeout and connection settings
    connectionTimeout: 30000, // 30 seconds
    greetingTimeout: 15000,   // 15 seconds
    socketTimeout: 30000,     // 30 seconds
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    rateDelta: 10000,
    rateLimit: 3,
    // Additional SMTP options
    secure: true,
    port: 465,
    tls: {
      rejectUnauthorized: false
    }
  };

  // Alternative configuration for cloud servers
  const alternativeConfig = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER || 'promatics.abhishek5@gmail.com',
      pass: process.env.EMAIL_PASS || 'haji ykpi iyxa bkvp',
    },
    connectionTimeout: 20000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    }
  };

  try {
    // Try primary configuration first
    return nodemailer.createTransporter(primaryConfig);
  } catch (error) {
    console.log('Primary email config failed, trying alternative...');
    return nodemailer.createTransporter(alternativeConfig);
  }
};

const transporter = createTransporter();

// Test the connection
transporter.verify((error, success) => {
  if (error) {
    console.log('Email transporter verification failed:', error.message);
  } else {
    console.log('Email transporter is ready to send messages');
  }
});

module.exports = transporter;