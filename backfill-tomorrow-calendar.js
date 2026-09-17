#!/usr/bin/env node
/**
 * One-off script: adds already-approved bookings for tomorrow (Perth time)
 * to their location's Zoho Calendar. Needed only once, to backfill bookings
 * that were approved before the calendar integration existed.
 *
 * Run in an environment with real MONGODB_URI + Zoho env vars configured
 * (i.e. the deployed server), not a sandbox:
 *   node backfill-tomorrow-calendar.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./src/models/booking');
const { createBookingCalendarEvent } = require('./src/utils/zohoCalendar');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Perth (Australia/Perth) does not observe daylight saving, fixed UTC+8.
  const now = new Date();
  const perthNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const rangeStart = new Date(Date.UTC(perthNow.getUTCFullYear(), perthNow.getUTCMonth(), perthNow.getUTCDate() + 1));
  const rangeEnd = new Date(rangeStart.getTime() + 24 * 60 * 60 * 1000);

  console.log(`Looking for approved bookings between ${rangeStart.toISOString()} and ${rangeEnd.toISOString()}`);

  const bookings = await Booking.find({
    booking_status: 'approved',
    booking_date: { $gte: rangeStart, $lt: rangeEnd },
  });

  console.log(`Found ${bookings.length} approved booking(s) for tomorrow.`);

  let succeeded = 0;
  let failed = 0;

  for (const booking of bookings) {
    try {
      await createBookingCalendarEvent(booking);
      console.log(`Added to calendar: ${booking.booking_id} (${booking.vehicle_registration}, ${booking.location})`);
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
  console.error('Backfill script failed:', error.message);
  process.exit(1);
});
