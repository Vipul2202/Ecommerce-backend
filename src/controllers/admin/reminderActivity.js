// Owner-panel visibility into the automated reminder job
// (send-booking-reminders.js) so "did anything go out recently" can be
// checked from the panel instead of tailing the server log.

const fs = require("fs");
const path = require("path");
const Booking = require("../../models/booking");
const { getReminderPlan, getAppointmentDateTime, buildEmailHtml, SUBJECTS } = require("../../utils/sendBookingReminder");
const { isTestMode } = require("../../utils/reminderTestMode");
const utils = require("../../utils/utils");

const MAX_HOURS = 24 * 30;
const ENV_PATH = path.join(__dirname, "../../../.env");

// Lets the owner panel show at a glance whether reminder/rectification
// emails are currently redirected to a test inbox or actually reaching
// customers, without anyone needing to check the server's .env directly.
exports.getTestModeStatus = async (req, res) => {
  try {
    const testMode = isTestMode();
    return res.status(200).json({
      testMode,
      testEmail: testMode ? process.env.REMINDER_TEST_EMAIL || null : null,
    });
  } catch (error) {
    console.log(error);
    utils.handleError(res, error);
  }
};

// Flips REMINDER_TEST_MODE on the server: updates .env on disk (so the
// reminder cron job, which re-reads .env fresh on every 15-minute run,
// picks it up automatically) and this running process's own env (so
// admin-triggered sends, like the rectification button, reflect it
// immediately without a restart).
exports.setTestMode = async (req, res) => {
  try {
    const { testMode, testEmail } = req.body || {};
    if (typeof testMode !== "boolean") {
      return res.status(400).json({ message: "testMode (boolean) is required" });
    }
    if (testMode && !testEmail && !process.env.REMINDER_TEST_EMAIL) {
      return res.status(400).json({ message: "Provide testEmail — no REMINDER_TEST_EMAIL is set yet" });
    }

    let envContent;
    try {
      envContent = fs.readFileSync(ENV_PATH, "utf8");
    } catch (error) {
      return res.status(500).json({ message: "Could not read .env on the server" });
    }

    const lines = envContent.split("\n");
    const setLine = (key, value) => {
      const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
      const line = `${key}=${value}`;
      if (idx >= 0) lines[idx] = line;
      else lines.push(line);
    };

    setLine("REMINDER_TEST_MODE", testMode ? "true" : "false");
    if (testMode && testEmail) setLine("REMINDER_TEST_EMAIL", testEmail);
    fs.writeFileSync(ENV_PATH, lines.join("\n"));

    process.env.REMINDER_TEST_MODE = testMode ? "true" : "false";
    if (testMode && testEmail) process.env.REMINDER_TEST_EMAIL = testEmail;

    return res.status(200).json({
      testMode,
      testEmail: testMode ? process.env.REMINDER_TEST_EMAIL || null : null,
    });
  } catch (error) {
    console.log(error);
    utils.handleError(res, error);
  }
};

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
