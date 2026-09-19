// Owner-panel tools for rectifying the reminder bug fixed in commit
// 14491c7 ("Fix: don't send reminders for bookings whose appointment
// already passed"). Before that fix, an old approved booking that was
// never notified could get sent a "coming up" / "be on time" email even
// though its appointment had already happened.
//
// This does NOT auto-send anything — it only lists who was affected and
// lets the owner preview and trigger each correction email one at a time
// from the owner panel.

const Booking = require("../../models/booking");
const { sendEmail } = require("../../utils/sendemail");
const { resolveRecipient, resolveSubject, isTestMode } = require("../../utils/reminderTestMode");
const { getAppointmentDateTime } = require("../../utils/sendBookingReminder");
const utils = require("../../utils/utils");

const FIX_DEPLOYED_AT = new Date("2026-09-19T03:29:47Z");

const buildCorrectionEmail = (booking) => ({
  subject: "Correction: our earlier email was sent in error",
  html: `
<div style="font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <tr>
      <td style="padding: 20px 30px; background-color: #6c757d; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px;">A Reminder Was Sent In Error</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px;">
        <p style="font-size: 16px; color: #333;">Hi ${booking.first_name || "there"},</p>
        <p style="font-size: 15px; color: #555; line-height: 1.6;">
          You may have received an automated booking reminder from us earlier. That was sent in error, due to a technical issue on our end &mdash; it doesn't reflect any new or upcoming booking, and there's nothing you need to do.
        </p>
        <p style="font-size: 15px; color: #555; line-height: 1.6;">
          We're sorry for any confusion this may have caused.
        </p>
        <p style="margin-top: 20px; font-size: 14px; color: #555;">
          If you have any questions, or would like to make a new booking, feel free to reach out to us anytime.
        </p>
        <p style="margin-top: 24px; font-size: 14px; color: #555;">
          Thanks for your patience,<br>Car Saloon Perth
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 30px; background-color: #f0f0f0; text-align: center; color: #666; font-size: 13px;">
        &copy; 2026 CarSaloon. All rights reserved.
      </td>
    </tr>
  </table>
</div>`,
});

const findAffectedBookings = async () => {
  const candidates = await Booking.find({
    reminder_sent: true,
    updatedAt: { $lt: FIX_DEPLOYED_AT },
  }).sort({ updatedAt: -1 });

  return candidates.filter((b) => {
    if (!b.booking_date || !b.booking_time || !b.updatedAt || !b.email) return false;
    const appointmentAt = getAppointmentDateTime(b.booking_date, b.booking_time);
    return appointmentAt.getTime() < b.updatedAt.getTime();
  });
};

exports.listErroneousReminders = async (req, res) => {
  try {
    const affected = await findAffectedBookings();
    return res.status(200).json({
      total: affected.length,
      testMode: isTestMode(),
      bookings: affected,
    });
  } catch (error) {
    console.log(error);
    utils.handleError(res, error);
  }
};

exports.previewRectificationEmail = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    const { subject, html } = buildCorrectionEmail(booking);
    return res.status(200).json({
      to: booking.email,
      subject,
      html,
      testMode: isTestMode(),
      willActuallyDeliverTo: isTestMode() ? process.env.REMINDER_TEST_EMAIL || null : booking.email,
      alreadySent: !!booking.rectification_sent,
      rectificationSentAt: booking.rectification_sent_at || null,
    });
  } catch (error) {
    console.log(error);
    utils.handleError(res, error);
  }
};

exports.sendRectificationEmail = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (!booking.email) {
      return res.status(400).json({ message: "Booking has no email on file" });
    }
    if (booking.rectification_sent && !req.body?.force) {
      return res.status(409).json({
        message: "Rectification email already sent for this booking",
        rectificationSentAt: booking.rectification_sent_at,
      });
    }

    const { subject, html } = buildCorrectionEmail(booking);
    const ok = await sendEmail({
      to: resolveRecipient(booking.email),
      subject: resolveSubject(subject, booking.email),
      html,
    });

    if (!ok) {
      return res.status(502).json({ message: "Email send failed, booking not marked as rectified" });
    }

    booking.rectification_sent = true;
    booking.rectification_sent_at = new Date();
    await booking.save();

    return res.status(200).json({
      message: "Rectification email sent",
      testMode: isTestMode(),
      deliveredTo: isTestMode() ? process.env.REMINDER_TEST_EMAIL : booking.email,
      rectificationSentAt: booking.rectification_sent_at,
    });
  } catch (error) {
    console.log(error);
    utils.handleError(res, error);
  }
};
