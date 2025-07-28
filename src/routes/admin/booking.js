const express=require('express')
const router=express.Router()
const controller = require('../../controllers/admin/booking')
const trimRequest =require('trim-request')
const Auth=require('../../middleware/auth')
router.get("/get-bookings",trimRequest.all,controller.bookingList)
router.post("/change-booking-status",trimRequest.all,controller.changeBookingStatus)
router.get("/get-booking/:id",trimRequest.all,controller.getSingleBooking)




module.exports = router;
