// Safety switch for customer-facing booking emails (approval, cancellation,
// reschedule-confirmed, booking-deleted). While CUSTOMER_EMAIL_TEST_MODE is
// explicitly "true", every customer-facing email is redirected to
// REMINDER_TEST_EMAIL with a [TEST] subject prefix instead of going to the
// real customer — useful for testing a flow against real bookings without
// emailing real customers.
//
// Deliberately separate from REMINDER_TEST_MODE (reminderTestMode.js), which
// also redirects admin/location notifications — this toggle only affects
// the customer, so admin/location can keep receiving real notifications
// while customer emails are paused.
const isCustomerTestMode = () => process.env.CUSTOMER_EMAIL_TEST_MODE === 'true';

const resolveCustomerRecipient = (realRecipient) => {
  if (!isCustomerTestMode()) return realRecipient;
  const testEmail = process.env.REMINDER_TEST_EMAIL;
  if (!testEmail) {
    throw new Error('CUSTOMER_EMAIL_TEST_MODE is on but REMINDER_TEST_EMAIL is not set in .env');
  }
  return testEmail;
};

const resolveCustomerSubject = (subject, realRecipient) => {
  if (!isCustomerTestMode()) return subject;
  return `[TEST → ${realRecipient}] ${subject}`;
};

module.exports = { isCustomerTestMode, resolveCustomerRecipient, resolveCustomerSubject };
