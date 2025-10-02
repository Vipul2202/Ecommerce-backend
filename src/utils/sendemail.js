const transporter = require('../config/mailier');

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Sleep function for retry delays
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

exports.sendEmail = async ({ to, subject, html }) => {
  // Validate required fields
  if (!to) {
    console.error('Email send error: No recipients defined - "to" field is required');
    return false;
  }
  if (!subject) {
    console.error('Email send error: Subject is required');
    return false;
  }
  if (!html) {
    console.error('Email send error: HTML content is required');
    return false;
  }

  let lastError = null;
  
  // Retry logic
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Email send attempt ${attempt}/${MAX_RETRIES} to: ${to}`);
      
      const info = await transporter.sendMail({
        from: 'car salon',
        to,
        subject,
        html,
      });

      console.log(`Email sent successfully on attempt ${attempt}:`, info.messageId);
      return true;
      
    } catch (error) {
      lastError = error;
      console.error(`Email send attempt ${attempt} failed:`, error.message);
      
      // Don't retry on certain errors
      if (error.code === 'EAUTH' || error.code === 'EENVELOPE') {
        console.error('Authentication or envelope error, not retrying');
        break;
      }
      
      // Wait before retrying (except on last attempt)
      if (attempt < MAX_RETRIES) {
        console.log(`Waiting ${RETRY_DELAY}ms before retry...`);
        await sleep(RETRY_DELAY);
      }
    }
  }
  
  console.error('All email send attempts failed:', lastError);
  
  // Don't throw the error, just return false to prevent booking failure
  // The booking should still be created even if email fails
  return false;
};
