#!/usr/bin/env node
/**
 * Checks every approved, not-yet-notified booking and sends whichever
 * notice is due, based on that booking's own tier and trigger time — see
 * src/utils/sendBookingReminder.js for the full tier logic.
 *
 * Meant to run frequently (every 15 minutes), not once a day — the tiers
 * trigger at specific offsets before each booking's own appointment time
 * (48h / 36h / 2h before), not on a fixed daily schedule. Crontab entry
 * (server timezone is already Australia/Perth):
 *   * /15 * * * * cd /home/backends/Ecommerce-backend && /usr/bin/node send-booking-reminders.js >> /var/log/booking-reminders.log 2>&1
 *   (remove the space between "*" and "/15" — written apart here only so
 *   this doesn't render as a comment-close inside the block comment)
 *
 * Can also be run manually at any time — safe to run against the real
 * database whenever, since REMINDER_TEST_MODE (when not "false") redirects
 * every email to REMINDER_TEST_EMAIL instead of the real customer.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./src/models/booking');
const { maybeSendReminder } = require('./src/utils/sendBookingReminder');
const { isTestMode } = require('./src/utils/reminderTestMode');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  console.log(`REMINDER_TEST_MODE: ${isTestMode() ? 'ON (redirecting to ' + (process.env.REMINDER_TEST_EMAIL || '<unset!>') + ')' : 'OFF (sending to real customers)'}`);

  const candidates = await Booking.find({
    booking_status: 'approved',
    reminder_sent: { $ne: true },
  });

  console.log(`Checking ${candidates.length} approved, not-yet-notified booking(s).`);

  let sent = 0;
  let notDueYet = 0;

  for (const candidate of candidates) {
    const didSend = await maybeSendReminder(candidate._id);
    if (didSend) {
      sent++;
    } else {
      notDueYet++;
    }
  }

  console.log(`Done. ${sent} sent, ${notDueYet} not due yet (or already claimed elsewhere).`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((error) => {
  console.error('Reminder check failed:', error.message);
  process.exit(1);
});
