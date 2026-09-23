// Single source of truth for "when should this booking's reminder go out,
// and has it gone out yet." Called by the periodic checker script
// (send-booking-reminders.js), which runs every 15 minutes and asks this
// for every approved, not-yet-notified booking.
//
// Two tiers, both using the same "be on time" email (no Cancel/Reschedule
// links — that self-service option has been turned off, see
// src/controllers/user/bookingManage.js):
//   - 24h+ lead time  -> sent 24h before the appointment
//   - under 24h lead time -> sent 2h before (there's no earlier window left)
//
// If a booking's trigger point has already passed by the time it's first
// checked (e.g. approved late), it sends on the very next check instead of
// waiting — nothing needs to line up with when a fixed daily job runs.

const Booking = require('../models/booking');
const { getBookingConfirmedBeOnTimeEmail } = require('../../public/Email Templates/forgotpassword');
const { sendEmail } = require('./sendemail');
const { resolveRecipient, resolveSubject } = require('./reminderTestMode');

const HOUR_MS = 60 * 60 * 1000;

// booking_date is stored as UTC midnight representing the Perth calendar
// day; booking_time is a Perth wall-clock "HH:mm" (fixed UTC+8, no
// daylight saving).
const getAppointmentDateTime = (bookingDate, bookingTime) => {
  const d = bookingDate instanceof Date ? bookingDate : new Date(bookingDate);
  const [hh, mm] = String(bookingTime).split(':').map(Number);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hh - 8, mm));
};

// Decides which tier a booking falls into and the exact moment its notice
// should be sent.
const getReminderPlan = (booking) => {
  const appointmentAt = getAppointmentDateTime(booking.booking_date, booking.booking_time);
  const leadTimeHours = (appointmentAt.getTime() - booking.createdAt.getTime()) / HOUR_MS;

  if (leadTimeHours >= 24) {
    return { type: 'reminder', triggerAt: new Date(appointmentAt.getTime() - 24 * HOUR_MS) };
  }
  return { type: 'confirmation', triggerAt: new Date(appointmentAt.getTime() - 2 * HOUR_MS) };
};

const SUBJECTS = {
  reminder: 'Your booking is coming up',
  confirmation: 'Your booking is confirmed — see you soon',
};

// Same template either way — the "be on time" confirmation, with no
// Cancel/Reschedule links. frontendUrl is unused now but kept in the
// signature so callers don't need to change.
const buildEmailHtml = (booking, type, frontendUrl) => {
  return getBookingConfirmedBeOnTimeEmail({
    vehicle_registration: booking.vehicle_registration,
    services: booking.services,
    location: booking.location,
    booking_date: booking.booking_date,
    booking_time: booking.booking_time,
    first_name: booking.first_name,
  });
};

// Atomically claims and sends the right notice for one booking, if its
// trigger point has arrived and it hasn't been notified yet. Returns true
// if it sent (or attempted to send) a notice just now.
const maybeSendReminder = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) return false;
  if (booking.booking_status !== 'approved') return false;
  if (booking.reminder_sent) return false;

  const { type, triggerAt } = getReminderPlan(booking);
  if (Date.now() < triggerAt.getTime()) return false;

  // The trigger point being in the past only means "due" for a booking
  // whose appointment is still ahead of us. If the appointment itself has
  // already passed (an old booking that was never notified for whatever
  // reason), silently retire it instead of sending a "coming up" or
  // "be on time" email for something that already happened.
  const appointmentAt = getAppointmentDateTime(booking.booking_date, booking.booking_time);
  if (Date.now() >= appointmentAt.getTime()) {
    await Booking.updateOne({ _id: booking._id, reminder_sent: { $ne: true } }, { $set: { reminder_sent: true } });
    console.log(`Retired without emailing (appointment already passed): ${booking.booking_id} (${booking.vehicle_registration}, ${booking.location})`);
    return false;
  }

  // Atomic claim: flip reminder_sent first, as a single DB operation, so
  // two overlapping checks can never both send for the same booking.
  const claimed = await Booking.findOneAndUpdate(
    { _id: booking._id, reminder_sent: { $ne: true } },
    { $set: { reminder_sent: true } },
    { new: true }
  );
  if (!claimed) return false;

  const frontendUrl = (process.env.USER_FRONTEND_URL || 'https://carsaloon.com.au').replace(/\/$/, '');
  const html = buildEmailHtml(claimed, type, frontendUrl);

  try {
    await sendEmail({
      to: resolveRecipient(claimed.email),
      subject: resolveSubject(SUBJECTS[type], claimed.email),
      html,
    });
    console.log(`Sent ${type}: ${claimed.booking_id} (${claimed.vehicle_registration}, ${claimed.location})`);
    return true;
  } catch (error) {
    // Already claimed above, so this booking won't be retried — a
    // duplicate is worse than an occasional missed notice from a
    // transient send failure. Worth checking the log if this happens.
    console.error(`Failed to send ${type} for ${claimed.booking_id} (already marked notified, will not retry):`, error.response?.data || error.message);
    return false;
  }
};

module.exports = { maybeSendReminder, getReminderPlan, getAppointmentDateTime, buildEmailHtml, SUBJECTS };
