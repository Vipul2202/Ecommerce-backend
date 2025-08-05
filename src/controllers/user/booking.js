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
        const booking=await Booking.create({...data,booking_id})
       const confirmationLink=`http://localhost:9006/user/confirm-booking/${booking._id}`; 
        const html=getBookingConfirmationEmail(data.first_name,confirmationLink)
     const ress=   await sendEmail(
      {
        to:data.email,
        subject: "Confirm your booking",
        confirmationLink,
        html
      },
      
    );
    console.log("ress",ress);
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
      link:`${process.env.USER_FRONTEND_URL}user/confirm-booking/${booking_id}`

    };

    const html = getAdminNewBookingEmail(datatosend);
    const adminemail=process.env.ADMIN_EMAIL
    console.log("adminemail",adminemail);

    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: "You have a new booking",
      html,
    });

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

