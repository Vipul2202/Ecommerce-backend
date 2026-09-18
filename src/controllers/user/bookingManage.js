const {
  getOwnerBookingCancelledByCustomerEmail,
  getOwnerRescheduleRequestEmail,
} = require('../../../public/Email Templates/forgotpassword');
const Booking = require('../../models/booking');
const { deleteBookingCalendarEvent } = require('../../utils/zohoCalendar');
const { notifyOwners, isTestMode } = require('../../utils/ownerNotify');

const LOCATION_PHONES = {
  Myaree: '0430 170 164',
  Midland: '0478 551 640',
};

const CHANGE_CUTOFF_HOURS = 24;

// booking_date is stored as UTC midnight representing the Perth calendar day;
// booking_time is a Perth wall-clock "HH:mm" (fixed UTC+8, no daylight saving).
const getAppointmentDateTime = (bookingDate, bookingTime) => {
  const d = bookingDate instanceof Date ? bookingDate : new Date(bookingDate);
  const [hh, mm] = String(bookingTime).split(':').map(Number);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hh - 8, mm));
};

const canStillModify = (booking) => {
  if (booking.booking_status !== 'approved') return false;
  const appointmentAt = getAppointmentDateTime(booking.booking_date, booking.booking_time);
  const cutoff = appointmentAt.getTime() - CHANGE_CUTOFF_HOURS * 60 * 60 * 1000;
  return Date.now() < cutoff;
};

exports.getManageBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    return res.status(200).json({
      data: {
        booking_id: booking.booking_id,
        vehicle_registration: booking.vehicle_registration,
        services: booking.services,
        location: booking.location,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        booking_status: booking.booking_status,
        canModify: canStillModify(booking),
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

    if (!canStillModify(booking)) {
      return res.status(400).json({
        message: 'This booking can no longer be changed online. Please call us directly.',
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

    if (!canStillModify(booking)) {
      return res.status(400).json({
        message: 'This booking can no longer be changed online. Please call us directly.',
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
      html: getOwnerRescheduleRequestEmail(booking, previous),
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
