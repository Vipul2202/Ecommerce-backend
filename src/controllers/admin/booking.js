const {
  getBookingConfirmationEmail,
  getBookingApprovalEmail,
  getBookingCancellationEmail,
} = require("../../../public/Email Templates/forgotpassword");
const Booking = require("../../models/booking");
const User = require("../../models/user");
const { sendEmail } = require("../../utils/sendemail");
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
      query.status = status;
    }
    query.is_verified = false;
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
        { booking_status: status, is_verified: true,message:reason },
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
        message: booking.message,

      };

      const html = getBookingApprovalEmail(datatosend);
      await sendEmail({
        to: booking.email,
        subject: "Your Booking has been approved",
        html,
      });
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
        to: booking.email,
        subject: "Your Booking has been cancelled",
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
    return res.status(200).json({ data:booking, message: "Booking fetched successfully" });
  } catch (error) {
    console.log(error);
    utils.handleError(res, error);
  }
}
