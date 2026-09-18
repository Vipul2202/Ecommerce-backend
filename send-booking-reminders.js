#!/usr/bin/env node
/**
 * Sends the 48-hour reminder email (with Cancel/Reschedule links) for every
 * approved booking happening in 2 days' time (Perth calendar day) that
 * hasn't already been reminded.
 *
 * NOT scheduled automatically yet. Run manually while testing:
 *   node send-booking-reminders.js
 *
 * While REMINDER_TEST_MODE is not "false" in .env, every email is
 * redirected to REMINDER_TEST_EMAIL instead of the real customer, so this
 * is safe to run against the real database at any time.
 *
 * Once testing is done and REMINDER_TEST_MODE=false, add a daily crontab
 * entry (8:00am Perth = 00:00 UTC, fixed offset, no daylight saving):
 *   0 0 * * * cd /home/backends/Ecommerce-backend && /usr/bin/node send-booking-reminders.js >> /var/log/booking-reminders.log 2>&1
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
  const rangeStart = new Date(Date.UTC(perthNow.getUTCFullYear(), perthNow.getUTCMonth(), perthNow.getUTCDate() + 2));
  const rangeEnd = new Date(rangeStart.getTime() + 24 * 60 * 60 * 1000);

  console.log(`Looking for approved, not-yet-reminded bookings between ${rangeStart.toISOString()} and ${rangeEnd.toISOString()}`);

  const bookings = await Booking.find({
    booking_status: 'approved',
    reminder_sent: { $ne: true },
    booking_date: { $gte: rangeStart, $lt: rangeEnd },
  });

  console.log(`Found ${bookings.length} booking(s) to remind.`);

  let succeeded = 0;
  let failed = 0;

  for (const booking of bookings) {
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

      booking.reminder_sent = true;
      await booking.save();

      console.log(`Reminded: ${booking.booking_id} (${booking.vehicle_registration}, ${booking.location})`);
      succeeded++;
    } catch (error) {
      console.error(`Failed for ${booking.booking_id}:`, error.response?.data || error.message);
      failed++;
    }
  }

  console.log(`Done. ${succeeded} succeeded, ${failed} failed.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((error) => {
  console.error('Reminder script failed:', error.message);
  process.exit(1);
});
