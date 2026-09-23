const {
  getOwnerBookingCancelledByCustomerEmail,
  getOwnerRescheduleRequestEmail,
  getBookingRescheduleDeclinedEmail,
} = require('../../../public/Email Templates/forgotpassword');
const Booking = require('../../models/booking');
const { deleteBookingCalendarEvent } = require('../../utils/zohoCalendar');
const { notifyOwners, isTestMode } = require('../../utils/ownerNotify');
const { sendEmail } = require('../../utils/sendemail');

const API_BASE = 'https://api.carsaloon.com.au';

const LOCATION_PHONES = {
  Myaree: '0430 170 164',
  Midland: '0478 551 640',
};

const CHANGE_CUTOFF_HOURS = 24;

// Online self-service cancel/reschedule is turned off. The page and these
// endpoints stay in place — customers holding an old reminder email with a
// cancel/reschedule link (or anyone else who finds the URL) just always
// get blocked now, same as any other blockReason, instead of the routes
// being removed outright.
const MANAGE_BOOKING_DISABLED = true;

// booking_date is stored as UTC midnight representing the Perth calendar day;
// booking_time is a Perth wall-clock "HH:mm" (fixed UTC+8, no daylight saving).
const getAppointmentDateTime = (bookingDate, bookingTime) => {
  const d = bookingDate instanceof Date ? bookingDate : new Date(bookingDate);
  const [hh, mm] = String(bookingTime).split(':').map(Number);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hh - 8, mm));
};

// Returns null if the booking can still be cancelled/rescheduled online, or
// a specific reason code otherwise. Keeping this specific (rather than a
// plain true/false) matters — "you already have a reschedule pending" and
// "it's within 24 hours" are very different situations for the customer.
const getBlockReason = (booking) => {
  if (MANAGE_BOOKING_DISABLED) return 'disabled';
  if (booking.booking_status === 'cancelled') return 'cancelled';
  if (booking.booking_status === 'pending') return 'pending_approval';
  if (booking.booking_status !== 'approved') return 'not_available';

  const appointmentAt = getAppointmentDateTime(booking.booking_date, booking.booking_time);
  const cutoff = appointmentAt.getTime() - CHANGE_CUTOFF_HOURS * 60 * 60 * 1000;
  if (Date.now() >= cutoff) return 'too_late';

  return null;
};

const BLOCK_MESSAGES = {
  disabled: 'Online cancellation and rescheduling is no longer available. Please call us directly to make changes to your booking.',
  cancelled: 'This booking has already been cancelled.',
  pending_approval: "You already have a change pending approval for this booking — we'll email you once it's confirmed.",
  not_available: 'This booking can no longer be changed online. Please call us directly.',
  too_late: 'This booking can no longer be changed online. Please call us directly.',
};

exports.getManageBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const blockReason = getBlockReason(booking);

    return res.status(200).json({
      data: {
        booking_id: booking.booking_id,
        vehicle_registration: booking.vehicle_registration,
        services: booking.services,
        location: booking.location,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        booking_status: booking.booking_status,
        canModify: blockReason === null,
        blockReason,
        blockMessage: blockReason ? BLOCK_MESSAGES[blockReason] : null,
        locationPhone: LOCATION_PHONES[booking.location] || '',
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

// Immediate — no approval needed. Cancels the booking and removes its
// calendar event right away.
exports.cancelBookingByCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const blockReason = getBlockReason(booking);
    if (blockReason) {
      return res.status(400).json({
        message: BLOCK_MESSAGES[blockReason],
        reason: blockReason,
        locationPhone: LOCATION_PHONES[booking.location] || '',
      });
    }

    booking.booking_status = 'cancelled';
    booking.booking_cancel_reason = 'Cancelled by customer via reminder email';
    await booking.save();

    try {
      await deleteBookingCalendarEvent(booking);
    } catch (error) {
      console.error('Failed to delete Zoho Calendar event:', error.response?.data || error.message);
    }

    await notifyOwners({
      booking,
      subject: `Booking Cancelled by Customer - ${booking.vehicle_registration}`,
      html: getOwnerBookingCancelledByCustomerEmail(booking),
    });

    return res.status(200).json({ message: 'Booking cancelled successfully', testMode: isTestMode() });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

// Not immediate — puts the booking back to "pending" for the owner to
// approve. Nothing is confirmed to the customer yet, and the calendar isn't
// touched until that approval happens.
exports.rescheduleBookingByCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time, services } = req.body;

    const validationErrors = [];
    if (!date || !String(date).trim()) validationErrors.push('Date is required');
    if (!time || !String(time).trim()) validationErrors.push('Time is required');
    if (!Array.isArray(services) || services.length === 0) validationErrors.push('At least one service must be selected');

    if (date) {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) validationErrors.push('Please select a future date');
    }
    if (time) {
      const [hour, minute] = time.split(':').map(Number);
      const totalMinutes = hour * 60 + minute;
      if (totalMinutes < 7 * 60 || totalMinutes > 17 * 60) {
        validationErrors.push('Please select a time between 07:00 and 17:00');
      }
    }
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors: validationErrors });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const blockReason = getBlockReason(booking);
    if (blockReason) {
      return res.status(400).json({
        message: BLOCK_MESSAGES[blockReason],
        reason: blockReason,
        locationPhone: LOCATION_PHONES[booking.location] || '',
      });
    }

    const previous = {
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      services: booking.services,
    };

    booking.reschedule_history.push({
      previous_date: previous.booking_date,
      previous_time: previous.booking_time,
      previous_services: previous.services,
    });
    booking.booking_date = date;
    booking.booking_time = time;
    booking.services = services;
    booking.booking_status = 'pending';
    booking.is_verified = false;
    booking.reminder_sent = false;
    await booking.save();

    await notifyOwners({
      booking,
      subject: `Reschedule Request - ${booking.vehicle_registration} - Needs Approval`,
      html: getOwnerRescheduleRequestEmail(booking, previous, {
        approveLink: `${API_BASE}/user/confirm-booking/${booking._id}`,
        declineLink: `${API_BASE}/user/decline-reschedule/${booking._id}`,
      }),
    });

    return res.status(200).json({
      message: "Reschedule request submitted — we'll confirm your new time shortly.",
      testMode: isTestMode(),
      data: {
        booking_status: booking.booking_status,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

const renderInfoPage = (title, message) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; background-color: #f4f8fb; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
      .message-box { background-color: #eef6ff; border: 1px solid #a6c8e0; padding: 30px 40px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; max-width: 420px; }
      .message-box h1 { color: #2b5f8a; margin-bottom: 10px; }
      .message-box p { color: #3d3d3d; font-size: 16px; }
    </style>
  </head>
  <body>
    <div class="message-box">
      <h1>${title}</h1>
      <p>${message}</p>
    </div>
  </body>
  </html>
`;

// GET /user/decline-reschedule/:id — clicked from the reschedule-request
// email. Keeps the booking at its previous (already-approved) date/time/
// services instead of the customer's requested change. Idempotent, since
// email links get auto-visited by link-scanners and retried clients.
exports.declineReschedule = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).send(renderInfoPage('Not Found', 'This booking could not be found.'));
    }

    if (booking.booking_status !== 'pending' || booking.reschedule_history.length === 0) {
      return res.status(200).send(renderInfoPage(
        'Already Handled',
        'This reschedule request has already been handled — no further action is needed.'
      ));
    }

    const lastRequest = booking.reschedule_history[booking.reschedule_history.length - 1];
    const requested = {
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      services: booking.services,
    };

    booking.booking_date = lastRequest.previous_date;
    booking.booking_time = lastRequest.previous_time;
    booking.services = lastRequest.previous_services;
    booking.booking_status = 'approved';
    booking.is_verified = true;
    await booking.save();

    if (booking.email) {
      await sendEmail({
        to: booking.email,
        subject: "We Couldn't Move Your Booking",
        html: getBookingRescheduleDeclinedEmail(booking, requested),
      }).catch((error) => {
        console.error('Failed to send reschedule-declined email:', error);
      });
    }

    return res.status(200).send(renderInfoPage(
      'Reschedule Declined',
      "The customer's original booking has been kept, and they've been notified."
    ));
  } catch (error) {
    console.error(error);
    return res.status(500).send(renderInfoPage('Error', 'Something went wrong.'));
  }
};
