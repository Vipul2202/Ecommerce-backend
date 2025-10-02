const { getBookingConfirmationEmail, getAdminNewBookingEmail } = require('../../../public/Email Templates/forgotpassword');
const Booking= require('../../models/booking')
const User = require("../../models/user");
const { sendEmail } = require("../../utils/sendemail");
const utils = require("../../utils/utils");
exports.createBooking=async(req,res)=>{
    try {
        const data=req.body
        console.log("dataaa",data);
        const booking_id= utils.generateBookingId()
        console.log("booking_id",booking_id);
       
        console.log("data",data);
        const booking=await Booking.create({
            ...data,
            booking_id,
            first_name: data.firstName,
            last_name: data.lastName,
            car_type: data.carType,
            vehicle_registration: data.registration,
            booking_date: data.date,
            booking_time: data.time
        })
        
        // Prepare data for admin notification
        const adminNotificationData = {
          booking_id: booking_id,
          car_type: data.carType,
          vehicle_registration: data.registration,
          services: data.services,
          booking_date: new Date(data.date), // Convert to Date object
          booking_time: data.time, // Keep as string for time display
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone: data.phone,
          booking_status: 'pending',
          link: `https://api.carsaloon.com.au/user/confirm-booking/${booking._id}`
        };

        const html = getAdminNewBookingEmail(adminNotificationData);
        const adminemail = process.env.ADMIN_EMAIL || 'nik.05.jindal@gmail.com';
        console.log("adminemail", adminemail);

        // Check if ADMIN_EMAIL is configured
        if (!adminemail) {
          console.error('ADMIN_EMAIL environment variable is not set');
          return res.status(500).json({ message: "Admin email not configured" });
        }

        try {
          const ress = await sendEmail({
            to: adminemail,
            subject: "New Booking Request - Action Required",
            html,
          });
          console.log("Admin notification sent:", ress);
        } catch (error) {
          console.error('Failed to send admin notification email:', error);
          // Continue with the response even if email fails
        }
        return res.status(201).json({message:"Booking created successfully",booking})

        
    } catch (error) {
        utils.handleError(res, error);
        
    }
}
exports.confirmBooking = async (req, res) => {
  try {
    const booking_id = req.params.id;

    const booking = await Booking.findOne({ _id: booking_id });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    booking.is_verified = true;
    await booking.save();

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
      link:`https://carsaloon.com.au/useForm/${booking_id}`

    };

    // Send confirmation email to user
    const userConfirmationHtml = getBookingConfirmationEmail(`${booking.first_name} ${booking.last_name}`, null);
    
    try {
      await sendEmail({
        to: booking.email,
        subject: "Your Booking Has Been Confirmed",
        html: userConfirmationHtml,
      });
      console.log("User confirmation email sent successfully");
    } catch (error) {
      console.error('Failed to send user confirmation email:', error);
      // Continue with the response even if email fails
    }

return res.status(200).send(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Booking Confirmed</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f8fb;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
      }
      .message-box {
        background-color: #e0f9e0;
        border: 1px solid #a6d8a8;
        padding: 30px 40px;
        border-radius: 10px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        text-align: center;
      }
      .message-box h1 {
        color: #2b7a2b;
        margin-bottom: 10px;
      }
      .message-box p {
        color: #3d3d3d;
        font-size: 16px;
      }
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

