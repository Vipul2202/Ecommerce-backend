const { getBookingConfirmationEmail, getAdminNewBookingEmail, getBookingApprovalEmail } = require('../../../public/Email Templates/forgotpassword');
const Booking = require('../../models/booking')
const User = require("../../models/user");
const { sendEmail } = require("../../utils/sendemail");
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
      phone: data.phone.toString().trim()
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
        subject: "New Booking Request - Action Required",
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

    booking.is_verified = true;
    booking.booking_status = "approved";
    await booking.save();

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
        to: booking.email,
        subject: "Your Booking Has Been Confirmed",
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
      link: `https://api.carsaloon.com.au/user/confirm-booking/${booking._id}`
    };

    const adminHtml = getAdminNewBookingEmail(adminNotificationData);
    const adminemail = process.env.ADMIN_EMAIL;

    // ── 3. Send email to admin ──────────────────────────────────
    if (adminemail) {
      await sendEmail({
        to: adminemail,
        subject: "Booking Approved",
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
        subject: `Booking Approved — ${booking.location}`,
        html: adminHtml,
      }).catch((error) => {
        console.error('Failed to send location confirmation email:', error);
      });
    } else {
      console.warn(`No location email configured for location: "${booking.location}". Check MIDLAND_EMAIL / MYAREE_EMAIL in .env`);
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
