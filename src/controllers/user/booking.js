const {
  getBookingConfirmationEmail,
  getAdminNewBookingEmail,
  getBookingApprovalEmail,
  getBookingRescheduleConfirmedEmail,
  getAdminRescheduleApprovedEmail,
  getBookingDeletedEmail,
} = require('../../../public/Email Templates/forgotpassword');
const Booking = require('../../models/booking')
const User = require("../../models/user");
const { sendEmail } = require("../../utils/sendemail");
const { upsertBookingCalendarEvent, deleteBookingCalendarEvent } = require("../../utils/zohoCalendar");
const { notifyOwners } = require("../../utils/ownerNotify");
const { resolveCustomerRecipient, resolveCustomerSubject } = require("../../utils/customerEmailTestMode");
const utils = require("../../utils/utils");

exports.createBooking = async (req, res) => {
  try {
    let data = req.body;
    if (Array.isArray(data) && data.length > 0) {
      data = data[0];
    }

    // Validation
    const validationErrors = [];
    if (!data.firstName || !data.firstName.trim()) validationErrors.push("Name is required");
    if (!data.location || !data.location.trim()) validationErrors.push("Location is required");
    if (!data.registration || !data.registration.trim()) validationErrors.push("Vehicle registration is required");
    if (!data.services || !Array.isArray(data.services) || data.services.length === 0) validationErrors.push("At least one service must be selected");
    if (!data.date || !data.date.trim()) validationErrors.push("Date is required");
    if (!data.time || !data.time.trim()) validationErrors.push("Time is required");
    if (!data.email || !data.email.trim()) validationErrors.push("Email is required");
    if (!data.phone || !data.phone.toString().trim()) validationErrors.push("Phone number is required");
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) validationErrors.push("Please enter a valid email address");
    if (data.phone && data.phone.toString().trim().length < 8) validationErrors.push("Please enter a valid phone number");
    if (data.registration && data.registration.trim().length < 3) validationErrors.push("Vehicle registration must be at least 3 characters");

    if (data.date) {
      const selectedDate = new Date(data.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) validationErrors.push("Please select a future date");
    }

    if (data.time) {
      const [hour, minute] = data.time.split(":").map(Number);
      const totalMinutes = hour * 60 + minute;
      if (totalMinutes < 7 * 60 || totalMinutes > 17 * 60) {
        validationErrors.push("Please select a time between 07:00 and 17:00");
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({ message: "Validation failed", errors: validationErrors });
    }

    // Guards against the same vehicle being booked twice for the same
    // slot — an accidental double-submit (double-click, page refresh) or
    // a repeat form submission. Only blocks against still-active bookings,
    // so re-booking after a cancellation is unaffected.
    const duplicateBooking = await Booking.findOne({
      vehicle_registration: data.registration.trim().toUpperCase(),
      booking_date: data.date,
      booking_time: data.time,
      booking_status: { $ne: 'cancelled' },
    });
    if (duplicateBooking) {
      return res.status(409).json({
        message: "A booking for this vehicle at this date and time already exists.",
      });
    }

    const booking_id = utils.generateBookingId();

    const booking = await Booking.create({
      booking_id,
      first_name: data.firstName.trim(),
      location: data.location,
      vehicle_registration: data.registration.trim().toUpperCase(),
      services: data.services,
      booking_date: data.date,
      booking_time: data.time,
      email: data.email.trim().toLowerCase(),
      phone: data.phone.toString().trim(),
      marketing_consent: !!data.marketingConsent
    });

    const adminNotificationData = {
      booking_id: booking.booking_id,
      vehicle_registration: booking.vehicle_registration,
      services: booking.services,
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      first_name: booking.first_name,
      location: booking.location,
      email: booking.email,
      phone: booking.phone,
      booking_status: booking.booking_status,
      link: `https://api.carsaloon.com.au/user/confirm-booking/${booking._id}`
    };

    const html = getAdminNewBookingEmail(adminNotificationData);
    const adminemail = process.env.ADMIN_EMAIL || 'nik.05.jindal@gmail.com';

    if (!adminemail) {
      console.error('ADMIN_EMAIL environment variable is not set');
      return res.status(500).json({ message: "Admin email not configured" });
    }

    try {
      await sendEmail({
        to: adminemail,
        subject: "New Booking Request",
        html,
      });
    } catch (error) {
      console.error('Failed to send admin notification email:', error);
      // Continue with the response even if email fails
    }

    return res.status(201).json({ message: "Booking created successfully", booking });

  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.confirmBooking = async (req, res) => {
  try {
    const booking_id = req.params.id;

    const booking = await Booking.findOne({ _id: booking_id });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // ── IDEMPOTENCY GUARD ──────────────────────────────────────
    // Email links get auto-visited by link-scanners / safe-link
    // checkers / retried clients. Without this check, every extra
    // visit re-runs the whole flow and re-sends every email again.
    if (booking.booking_status === "approved" && booking.is_verified) {
      return res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Already Confirmed</title>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f8fb; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .message-box { background-color: #eef6ff; border: 1px solid #a6c8e0; padding: 30px 40px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; }
            .message-box h1 { color: #2b5f8a; margin-bottom: 10px; }
            .message-box p { color: #3d3d3d; font-size: 16px; }
          </style>
        </head>
        <body>
          <div class="message-box">
            <h1>Already Confirmed</h1>
            <p>This booking has already been approved. No further action is needed.</p>
          </div>
        </body>
        </html>
      `);
    }

    // A booking already carrying a calendar event was previously approved
    // and has now been rescheduled by the customer — this approval is
    // confirming that new time, not a first-time approval.
    const isRescheduleApproval = !!booking.zoho_calendar_event_id;

    booking.is_verified = true;
    booking.booking_status = "approved";
    await booking.save();

    try {
      await upsertBookingCalendarEvent(booking);
    } catch (error) {
      console.error('Failed to sync Zoho Calendar event:', error.response?.data || error.message);
    }

    // Lets the owner/location notification offer a one-click way to delete
    // the booking (and its calendar event) after confirmation, without
    // needing to log into the owner panel.
    const deleteLink = `https://api.carsaloon.com.au/user/delete-booking/${booking._id}`;

    if (isRescheduleApproval) {
      // ── Customer: reschedule confirmed ─────────────────────────
      if (booking.email) {
        await sendEmail({
          to: resolveCustomerRecipient(booking.email),
          subject: resolveCustomerSubject("Your Booking Has Been Rescheduled", booking.email),
          html: getBookingRescheduleConfirmedEmail(booking),
        }).catch((error) => {
          console.error('Failed to send reschedule confirmation email:', error);
        });
      }

      // ── Admin + location: reschedule approved ──────────────────
      await notifyOwners({
        booking,
        subject: `Reschedule Approved - ${booking.vehicle_registration}`,
        html: getAdminRescheduleApprovedEmail({
          location: booking.location,
          vehicle_registration: booking.vehicle_registration,
          services: booking.services,
          booking_date: booking.booking_date,
          booking_time: booking.booking_time,
          first_name: booking.first_name,
          email: booking.email,
          phone: booking.phone,
          deleteLink,
        }),
      });
    } else {
      const datatosend = {
        booking_id: booking.booking_id,
        car_type: booking.car_type,
        vehicle_registration: booking.vehicle_registration,
        location: booking.location,
        services: booking.services,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        first_name: booking.first_name,
        last_name: booking.last_name,
        email: booking.email,
        phone: booking.phone,
        booking_status: booking.booking_status,
        message: booking.message || '',
        link: `https://carsaloon.com.au/useForm/${booking_id}`
      };

      // ── 1. Send confirmation email to customer ────────────────
      const userConfirmationHtml = getBookingApprovalEmail(datatosend);

      if (booking.email) {
        await sendEmail({
          to: resolveCustomerRecipient(booking.email),
          subject: resolveCustomerSubject("Your Booking Has Been Confirmed", booking.email),
          html: userConfirmationHtml,
        }).catch((error) => {
          console.error('Failed to send user confirmation email:', error);
        });
      } else {
        console.error('Cannot send confirmation email: booking.email is missing');
      }

      // ── 2. Build admin notification data ───────────────────────
      const adminNotificationData = {
        booking_id: booking.booking_id,
        vehicle_registration: booking.vehicle_registration,
        location: booking.location,
        services: booking.services,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        first_name: booking.first_name,
        email: booking.email,
        phone: booking.phone,
        booking_status: booking.booking_status,
        link: `https://api.carsaloon.com.au/user/confirm-booking/${booking._id}`,
        deleteLink,
      };

      const adminHtml = getAdminNewBookingEmail(adminNotificationData);
      const adminemail = process.env.ADMIN_EMAIL;

      // ── 3. Send email to admin ──────────────────────────────────
      if (adminemail) {
        await sendEmail({
          to: adminemail,
          subject: `Booking Approved - ${booking.vehicle_registration}`,
          html: adminHtml,
        }).catch((error) => {
          console.error('Failed to send admin confirmation email:', error);
        });
      } else {
        console.error('ADMIN_EMAIL environment variable is not set');
      }

      // ── 4. Send email to location-based recipients ──────────────
      const locationEmails = {
        myaree: process.env.MYAREE_EMAIL,
        midland: process.env.MIDLAND_EMAIL,
      };

      const bookingLocation = booking.location ? booking.location.toLowerCase().trim() : '';
      const locationEmail = locationEmails[bookingLocation];

      if (locationEmail) {
        await sendEmail({
          to: locationEmail,
          subject: `Booking Approved - ${booking.vehicle_registration} - ${booking.location}`,
          html: adminHtml,
        }).catch((error) => {
          console.error('Failed to send location confirmation email:', error);
        });
      } else {
        console.warn(`No location email configured for location: "${booking.location}". Check MIDLAND_EMAIL / MYAREE_EMAIL in .env`);
      }
    }

    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Booking Confirmed</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f8fb; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
          .message-box { background-color: #e0f9e0; border: 1px solid #a6d8a8; padding: 30px 40px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; }
          .message-box h1 { color: #2b7a2b; margin-bottom: 10px; }
          .message-box p { color: #3d3d3d; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="message-box">
          <h1>✅ Booking Confirmed!</h1>
          <p>Your booking has been successfully completed. Thank you for choosing us.</p>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    utils.handleError(res, error);
  }
};

const renderMessagePage = (title, message, { color = '#2b5f8a', bg = '#eef6ff', border = '#a6c8e0' } = {}) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; background-color: #f4f8fb; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
      .message-box { background-color: ${bg}; border: 1px solid ${border}; padding: 30px 40px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; max-width: 420px; }
      .message-box h1 { color: ${color}; margin-bottom: 10px; }
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

const renderDeleteConfirmPage = (booking) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Delete Booking</title>
    <style>
      body { font-family: Arial, sans-serif; background-color: #f4f8fb; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
      .box { background-color: #fff3f3; border: 1px solid #e3a6a6; padding: 30px 40px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; max-width: 440px; }
      .box h1 { color: #a02b2b; margin-bottom: 10px; }
      .box p { color: #3d3d3d; font-size: 15px; }
      table { margin: 16px auto; text-align: left; font-size: 14px; color: #333; }
      td { padding: 2px 10px 2px 0; }
      .btn { display: inline-block; padding: 12px 24px; border-radius: 5px; font-weight: bold; text-decoration: none; margin: 6px; border: none; font-size: 15px; cursor: pointer; }
      .btn-delete { background-color: #dc3545; color: #fff; }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>Delete This Booking?</h1>
      <p>This will permanently remove the booking and its calendar event. This cannot be undone.</p>
      <table>
        <tr><td><strong>Booking ID:</strong></td><td>${booking.booking_id || booking._id}</td></tr>
        <tr><td><strong>Vehicle:</strong></td><td>${booking.vehicle_registration || 'N/A'}</td></tr>
        <tr><td><strong>Customer:</strong></td><td>${booking.first_name || 'N/A'}</td></tr>
        <tr><td><strong>Location:</strong></td><td>${booking.location || 'N/A'}</td></tr>
      </table>
      <form method="POST" action="/user/delete-booking/${booking._id}/confirm" style="display:inline;">
        <button type="submit" class="btn btn-delete">Yes, Delete Booking</button>
      </form>
    </div>
  </body>
  </html>
`;

// ── Step 1: GET — shows a confirmation page before anything is deleted.
// Keeping delete behind an explicit button click (rather than deleting on
// GET) avoids accidental deletion from email link-scanners/safe-link
// checkers that auto-visit links in incoming mail.
exports.requestDeleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).send(renderMessagePage(
        "Booking Not Found",
        "This booking no longer exists — it may have already been deleted.",
        { color: '#a02b2b', bg: '#fff3f3', border: '#e3a6a6' }
      ));
    }
    return res.status(200).send(renderDeleteConfirmPage(booking));
  } catch (error) {
    utils.handleError(res, error);
  }
};

// ── Step 2: POST — the actual delete. Removes the Zoho Calendar event
// first (best-effort; a calendar failure shouldn't block the DB delete),
// then removes the booking itself.
exports.confirmDeleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).send(renderMessagePage(
        "Booking Not Found",
        "This booking no longer exists — it may have already been deleted.",
        { color: '#a02b2b', bg: '#fff3f3', border: '#e3a6a6' }
      ));
    }

    try {
      await deleteBookingCalendarEvent(booking);
    } catch (error) {
      console.error('Failed to delete Zoho Calendar event:', error.response?.data || error.message);
      // Continue — the booking should still be removed from our DB even
      // if the calendar call failed.
    }

    // Let the customer know their booking is gone — sent before the DB
    // delete so the booking's fields are still available to fill the
    // template. Best-effort: a failed email shouldn't block the delete.
    if (booking.email) {
      await sendEmail({
        to: resolveCustomerRecipient(booking.email),
        subject: resolveCustomerSubject("Your Booking at Car Saloon Has Been Cancelled", booking.email),
        html: getBookingDeletedEmail(booking),
      }).catch((error) => {
        console.error('Failed to send booking-deleted email to customer:', error);
      });
    }

    const summary = `Booking ${booking.booking_id || ''} for ${booking.vehicle_registration || 'the vehicle'} has been deleted and removed from the calendar.`;
    await Booking.findByIdAndDelete(booking._id);

    return res.status(200).send(renderMessagePage("Booking Deleted", summary, { color: '#2b7a2b', bg: '#e0f9e0', border: '#a6d8a8' }));
  } catch (error) {
    utils.handleError(res, error);
  }
};
