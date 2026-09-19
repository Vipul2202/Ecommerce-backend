// Owner-panel visibility into the automated reminder job
// (send-booking-reminders.js) so "did anything go out recently" can be
// checked from the panel instead of tailing the server log.

const Booking = require("../../models/booking");
const { getReminderPlan, getAppointmentDateTime, buildEmailHtml, SUBJECTS } = require("../../utils/sendBookingReminder");
const utils = require("../../utils/utils");

const MAX_HOURS = 24 * 30;

exports.listRecentReminders = async (req, res) => {
  try {
    // Either an explicit cutoff (?since=<ISO timestamp>, e.g. "today at
    // noon") or a rolling window (?hours=24). since wins when both/neither
    // are given a usable value.
    let since;
    if (req.query.since) {
      const parsed = new Date(req.query.since);
      if (!Number.isNaN(parsed.getTime())) since = parsed;
    }
    const hours = Math.min(Math.max(parseInt(req.query.hours, 10) || 24, 1), MAX_HOURS);
    if (!since) since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const bookings = await Booking.find({
      reminder_sent: true,
      updatedAt: { $gte: since },
    }).sort({ updatedAt: -1 });

    const reminders = bookings
      .filter((b) => {
        // Only bookings the reminder job actually emailed — excludes the
        // silent "retired without emailing" case for stale bookings whose
        // appointment had already passed (also flips reminder_sent, but
        // with no email sent).
        if (!b.booking_date || !b.booking_time || !b.updatedAt) return false;
        const appointmentAt = getAppointmentDateTime(b.booking_date, b.booking_time);
        return appointmentAt.getTime() >= b.updatedAt.getTime();
      })
      .map((b) => {
        let noticeType = null;
        try {
          noticeType = getReminderPlan(b).type;
        } catch (error) {
          noticeType = null;
        }
        return {
          _id: b._id,
          booking_id: b.booking_id,
          first_name: b.first_name,
          last_name: b.last_name,
          email: b.email,
          location: b.location,
          vehicle_registration: b.vehicle_registration,
          booking_date: b.booking_date,
          booking_time: b.booking_time,
          notice_type: noticeType,
          sent_at: b.updatedAt,
        };
      });

    return res.status(200).json({ total: reminders.length, since: since.toISOString(), reminders });
  } catch (error) {
    console.log(error);
    utils.handleError(res, error);
  }
};

// Reconstructs the exact email a given booking's reminder job send would
// have produced, from the booking's current stored data. Good enough for
// "what did we actually send" review as long as the booking's own fields
// (services, date/time, name, etc.) haven't since changed.
exports.previewSentReminder = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (!booking.reminder_sent) {
      return res.status(400).json({ message: "No reminder was sent for this booking" });
    }

    const { type } = getReminderPlan(booking);
    const frontendUrl = (process.env.USER_FRONTEND_URL || "https://carsaloon.com.au").replace(/\/$/, "");
    const html = buildEmailHtml(booking, type, frontendUrl);

    return res.status(200).json({
      to: booking.email,
      subject: SUBJECTS[type],
      html,
      noticeType: type,
      sentAt: booking.updatedAt,
    });
  } catch (error) {
    console.log(error);
    utils.handleError(res, error);
  }
};
