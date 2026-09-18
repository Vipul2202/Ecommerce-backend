// Shared helper for emailing the admin + the booking's location about a
// change, honoring the REMINDER_TEST_MODE redirect.

const { sendEmail } = require('./sendemail');
const { isTestMode, resolveRecipient, resolveSubject } = require('./reminderTestMode');

const getOwnerRecipients = (booking) => {
  const locationEmails = {
    myaree: process.env.MYAREE_EMAIL,
    midland: process.env.MIDLAND_EMAIL,
  };
  const bookingLocation = booking.location ? booking.location.toLowerCase().trim() : '';
  return [process.env.ADMIN_EMAIL, locationEmails[bookingLocation]];
};

const notifyOwners = async ({ booking, subject, html }) => {
  const recipients = getOwnerRecipients(booking).filter(Boolean);
  await Promise.all(
    recipients.map((realRecipient) =>
      sendEmail({
        to: resolveRecipient(realRecipient),
        subject: resolveSubject(subject, realRecipient),
        html,
      }).catch((error) => {
        console.error(`Failed to notify ${realRecipient}:`, error.message);
      })
    )
  );
};

module.exports = { getOwnerRecipients, notifyOwners, isTestMode };
