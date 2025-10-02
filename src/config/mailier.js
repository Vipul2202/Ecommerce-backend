const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'promatics.abhishek5@gmail.com', 
    pass: process.env.EMAIL_PASS || 'haji ykpi iyxa bkvp',   
  },
});

module.exports = transporter;
