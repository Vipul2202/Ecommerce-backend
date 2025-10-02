const transporter = require('../config/mailier');

exports.sendEmail = async ({ to, subject, html }) => {
  try {
    // Validate required fields
    if (!to) {
      throw new Error('No recipients defined - "to" field is required');
    }
    if (!subject) {
      throw new Error('Subject is required');
    }
    if (!html) {
      throw new Error('HTML content is required');
    }

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
    
    // Don't throw the error, just return false to prevent booking failure
    // The booking should still be created even if email fails
    return false;
  }
};
