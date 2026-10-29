const {
  getBookingConfirmationEmail,
  getBookingApprovalEmail,
  getBookingCancellationEmail,
  getBookingRescheduleConfirmedEmail,
  getAdminRescheduleApprovedEmail,
  getAdminNewBookingEmail,
} = require("../../../public/Email Templates/forgotpassword");
const Booking = require("../../models/booking");
const User = require("../../models/user");
const { sendEmail } = require("../../utils/sendemail");
const { upsertBookingCalendarEvent, deleteBookingCalendarEvent } = require("../../utils/zohoCalendar");
const { notifyOwners } = require("../../utils/ownerNotify");
const { resolveCustomerRecipient, resolveCustomerSubject } = require("../../utils/customerEmailTestMode");
const utils = require("../../utils/utils");
exports.bookingList = async (req, res) => {
  try {
    const { limit = 10, offset = 0, search, status } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (status) {
      query.booking_status = status;
    }
    // query.is_verified = false;
    const booking = await Booking.find(query)
      .limit(limit)
      .skip(offset)
      .sort({ createdAt: -1 });
    const total = await Booking.countDocuments(query);
    return res
      .status(200)
      .json({ total, booking, message: "Booking fetched successfully" });
  } catch (error) {
    console.log(error);
    utils.handleError(res, error);
  }
};

exports.changeBookingStatus = async (req, res) => {
  try {
    const { id, status, reason } = req.body;
    if (status === "approved") {
      const booking = await Booking.findByIdAndUpdate(
        id,
        { booking_status: status, is_verified: true, message: reason },
        { new: true }
      );

      // A booking already carrying a calendar event was previously approved
      // and has now been rescheduled by the customer — this approval is
      // confirming that new time, not a first-time approval.
      const isRescheduleApproval = !!booking.zoho_calendar_event_id;

      try {
        await upsertBookingCalendarEvent(booking);
      } catch (error) {
        console.error('Failed to sync Zoho Calendar event:', error.response?.data || error.message);
      }

      // Lets the owner/location notification offer a one-click way to delete
      // the booking (and its calendar event) after confirmation — same link
      // used by the email-based "Confirm Booking" approval flow.
      const deleteLink = `https://api.carsaloon.com.au/user/delete-booking/${booking._id}`;

      if (isRescheduleApproval) {
        await sendEmail({
          to: resolveCustomerRecipient(booking.email),
          subject: resolveCustomerSubject("Your Booking Has Been Rescheduled", booking.email),
          html: getBookingRescheduleConfirmedEmail(booking),
        });
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
          services: booking.services,
          booking_date: booking.booking_date,
          booking_time: booking.booking_time,
          first_name: booking.first_name,
          last_name: booking.last_name,
          email: booking.email,
          phone: booking.phone,
          booking_status: 'Approved',
          message: booking.message,
        };

        const html = getBookingApprovalEmail(datatosend);
        await sendEmail({
          to: resolveCustomerRecipient(booking.email),
          subject: resolveCustomerSubject("Your Booking has been approved", booking.email),
          html,
        });

        // Approving via the owner panel previously never notified the
        // admin/location at all (only the "Confirm Booking" email-link flow
        // did) — bring it in line so both approval paths send the same
        // owner-facing notification, including the Delete Booking link.
        await notifyOwners({
          booking,
          subject: `Booking Approved - ${booking.vehicle_registration}`,
          html: getAdminNewBookingEmail({
            booking_id: booking.booking_id,
            location: booking.location,
            vehicle_registration: booking.vehicle_registration,
            services: booking.services,
            booking_date: booking.booking_date,
            booking_time: booking.booking_time,
            first_name: booking.first_name,
            email: booking.email,
            phone: booking.phone,
            booking_status: booking.booking_status,
            deleteLink,
          }),
        });
      }

      return res.status(200).json({ message: "Booking status updated successfully" });
    } else if (status === "cancelled") {
      const booking = await Booking.findByIdAndUpdate(
        id,
        { booking_status: status, booking_cancel_reason: reason },
        { new: true }
      );
      const datatosend = {
        booking_id: booking.booking_id,
        car_type: booking.car_type,
        vehicle_registration: booking.vehicle_registration,
        services: booking.services,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        first_name: booking.first_name,
        last_name: booking.last_name,
        email: booking.email,
        phone: booking.phone,
        booking_status: booking.booking_status,
        booking_cancel_reason: booking.booking_cancel_reason,
      };
      const html = getBookingCancellationEmail(datatosend);
      await sendEmail({
        to: resolveCustomerRecipient(booking.email),
        subject: resolveCustomerSubject("Your Booking has been cancelled", booking.email),
        html,
      });
      return res.status(200).json({ message: "Booking status updated successfully" });
    }
  } catch (error) {
    console.log(error);
    utils.handleError(res, error);
  }
};
exports.getSingleBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    return res.status(200).json({ data: booking, message: "Booking fetched successfully" });
  } catch (error) {
    console.log(error);
    utils.handleError(res, error);
  }
};

exports.deleteBookings = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Provide at least one booking id to delete" });
    }

    const bookings = await Booking.find({ _id: { $in: ids } });
    await Promise.all(
      bookings.map((booking) =>
        deleteBookingCalendarEvent(booking).catch((error) => {
          console.error(`Failed to delete Zoho Calendar event for booking ${booking._id}:`, error.response?.data || error.message);
        })
      )
    );

    const result = await Booking.deleteMany({ _id: { $in: ids } });
    return res.status(200).json({
      message: "Booking(s) deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.log(error);
    utils.handleError(res, error);
  }
}
