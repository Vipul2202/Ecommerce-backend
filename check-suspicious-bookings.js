#!/usr/bin/env node
/**
 * Lists every approved booking with the fields relevant to the two
 * suspicious ones (Marie / Mandy Hillier, both missing `location`,
 * both dated 01-10-2026 11:00). Flags anything that shares that pattern:
 * missing/invalid location, or same date+time as another booking.
 *
 * Usage: cd /home/backends/Ecommerce-backend && node check-suspicious-bookings.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./src/models/booking');

const VALID_LOCATIONS = ['Midland', 'Myaree'];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const bookings = await Booking.find({ booking_status: 'approved' }).sort({ createdAt: 1 });
  console.log(`Total approved bookings: ${bookings.length}\n`);

  const dateTimeCounts = {};
  bookings.forEach((b) => {
    const key = `${b.booking_date ? new Date(b.booking_date).toISOString().slice(0, 10) : '?'} ${b.booking_time || '?'}`;
    dateTimeCounts[key] = (dateTimeCounts[key] || 0) + 1;
  });

  console.log('--- All approved bookings ---');
  bookings.forEach((b) => {
    const badLocation = !b.location || !VALID_LOCATIONS.includes(b.location);
    const dateKey = `${b.booking_date ? new Date(b.booking_date).toISOString().slice(0, 10) : '?'} ${b.booking_time || '?'}`;
    const duplicateSlot = dateTimeCounts[dateKey] > 1;
    const flag = badLocation || duplicateSlot ? '  <-- FLAGGED' : '';
    console.log(
      `${b.booking_id || b._id} | ${b.first_name || ''} ${b.last_name || ''} | ${b.email || ''} | ${b.vehicle_registration || ''} | loc=${b.location || 'MISSING'} | ${dateKey} | created=${b.createdAt ? b.createdAt.toISOString() : '?'}${flag}`
    );
  });

  console.log('\n--- Flagged only ---');
  const flagged = bookings.filter((b) => {
    const badLocation = !b.location || !VALID_LOCATIONS.includes(b.location);
    const dateKey = `${b.booking_date ? new Date(b.booking_date).toISOString().slice(0, 10) : '?'} ${b.booking_time || '?'}`;
    return badLocation || dateTimeCounts[dateKey] > 1;
  });
  if (flagged.length === 0) {
    console.log('None found beyond the two already known.');
  } else {
    flagged.forEach((b) => {
      console.log(`${b.booking_id || b._id} | ${b.first_name || ''} ${b.last_name || ''} | ${b.email || ''} | loc=${b.location || 'MISSING'} | created=${b.createdAt ? b.createdAt.toISOString() : '?'}`);
    });
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((error) => {
  console.error('Check failed:', error.message);
  process.exit(1);
});
