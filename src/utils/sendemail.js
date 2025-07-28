const transporter = require('../config/mailier');

exports.sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: 'car salon',
      to,
      subject,
      html,
    });

    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};
