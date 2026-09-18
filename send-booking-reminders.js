#!/usr/bin/env node
/**
 * Sends the reminder email (with Cancel/Reschedule links) for approved,
 * not-yet-reminded bookings happening tomorrow or the day after (Perth
 * calendar day) — a rolling 1-2 day window, not just "exactly 2 days out".
 *
 * That window matters: a booking made after today's cron run, for a date
 * exactly 2 days out, would otherwise fall between "too late for today's
 * run" and "tomorrow's run checks the wrong day" and never get reminded.
 * Catching tomorrow + the day after each run means anything missed on one
 * day's run still gets picked up on the next, with no duplicate sends
 * thanks to the reminder_sent flag.
 *
 * Scheduled daily via crontab (server timezone is already Australia/Perth,
 * so this runs in local time with no UTC conversion needed):
 *   0 8 * * * cd /home/backends/Ecommerce-backend && /usr/bin/node send-booking-reminders.js >> /var/log/booking-reminders.log 2>&1
 *
 * Can also be run manually at any time — safe to run against the real
 * database whenever, since REMINDER_TEST_MODE (when not "false") redirects
 * every email to REMINDER_TEST_EMAIL instead of the real customer.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./src/models/booking');
const { getBookingReminderEmail } = require('./public/Email Templates/forgotpassword');
const { sendEmail } = require('./src/utils/sendemail');
const { isTestMode, resolveRecipient, resolveSubject } = require('./src/utils/reminderTestMode');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  console.log(`REMINDER_TEST_MODE: ${isTestMode() ? 'ON (redirecting to ' + (process.env.REMINDER_TEST_EMAIL || '<unset!>') + ')' : 'OFF (sending to real customers)'}`);

  const frontendUrl = (process.env.USER_FRONTEND_URL || 'https://carsaloon.com.au').replace(/\/$/, '');

  // Perth (Australia/Perth) does not observe daylight saving, fixed UTC+8.
  const now = new Date();
  const perthNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  // Rolling window: tomorrow through the day after (2 days), not just a
  // single exact-day slice — see the file header for why.
  const rangeStart = new Date(Date.UTC(perthNow.getUTCFullYear(), perthNow.getUTCMonth(), perthNow.getUTCDate() + 1));
  const rangeEnd = new Date(Date.UTC(perthNow.getUTCFullYear(), perthNow.getUTCMonth(), perthNow.getUTCDate() + 3));

  console.log(`Looking for approved, not-yet-reminded bookings between ${rangeStart.toISOString()} and ${rangeEnd.toISOString()}`);

  const candidates = await Booking.find({
    booking_status: 'approved',
    reminder_sent: { $ne: true },
    booking_date: { $gte: rangeStart, $lt: rangeEnd },
  });

  console.log(`Found ${candidates.length} candidate booking(s) to remind.`);

  let succeeded = 0;
  let skipped = 0;
  let failed = 0;

  for (const candidate of candidates) {
    // Atomically claim the booking (flip reminder_sent first, as a single
    // DB operation) so two overlapping runs of this script can never both
    // send a reminder for the same booking — whichever one flips the flag
    // first wins, the other finds nothing to claim and moves on.
    const booking = await Booking.findOneAndUpdate(
      { _id: candidate._id, reminder_sent: { $ne: true } },
      { $set: { reminder_sent: true } },
      { new: true }
    );

    if (!booking) {
      console.log(`Skipped ${candidate.booking_id} — already claimed by another run.`);
      skipped++;
      continue;
    }

    try {
      const html = getBookingReminderEmail({
        vehicle_registration: booking.vehicle_registration,
        services: booking.services,
        location: booking.location,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        first_name: booking.first_name,
        cancel_link: `${frontendUrl}/manage-booking/${booking._id}?action=cancel`,
        reschedule_link: `${frontendUrl}/manage-booking/${booking._id}?action=reschedule`,
      });

      await sendEmail({
        to: resolveRecipient(booking.email),
        subject: resolveSubject('Your booking is coming up', booking.email),
        html,
      });

      console.log(`Reminded: ${booking.booking_id} (${booking.vehicle_registration}, ${booking.location})`);
      succeeded++;
    } catch (error) {
      // Already claimed above, so this booking won't be retried — that's
      // deliberate: a duplicate reminder is worse than an occasional missed
      // one caused by a transient send failure. Failures here are worth
      // checking the log for and reminding that customer manually if needed.
      console.error(`Failed for ${booking.booking_id} (already marked reminded, will not retry):`, error.response?.data || error.message);
      failed++;
    }
  }

  console.log(`Done. ${succeeded} succeeded, ${failed} failed, ${skipped} skipped (already claimed).`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((error) => {
  console.error('Reminder script failed:', error.message);
  process.exit(1);
});
