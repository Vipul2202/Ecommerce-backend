const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'promatics.abhishek5@gmail.com', 
    pass: 'haji ykpi iyxa bkvp',   
  },
});

module.exports = transporter;
