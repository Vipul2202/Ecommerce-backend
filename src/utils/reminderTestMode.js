// Safety switch for the booking reminder / cancel / reschedule feature.
// While REMINDER_TEST_MODE is not explicitly "false", every email this
// feature sends is redirected to REMINDER_TEST_EMAIL with a [TEST] subject
// prefix, so it can be exercised against real booking data without any
// real customer receiving anything.

const isTestMode = () => process.env.REMINDER_TEST_MODE !== 'false';

const resolveRecipient = (realRecipient) => {
  if (!isTestMode()) return realRecipient;
  const testEmail = process.env.REMINDER_TEST_EMAIL;
  if (!testEmail) {
    throw new Error('REMINDER_TEST_MODE is on but REMINDER_TEST_EMAIL is not set in .env');
  }
  return testEmail;
};

const resolveSubject = (subject, realRecipient) => {
  if (!isTestMode()) return subject;
  return `[TEST → ${realRecipient}] ${subject}`;
};

module.exports = { isTestMode, resolveRecipient, resolveSubject };
