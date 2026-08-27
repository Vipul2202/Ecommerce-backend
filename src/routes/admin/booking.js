const express=require('express')
const router=express.Router()
const controller = require('../../controllers/admin/booking')
const trimRequest =require('trim-request')
const Auth=require('../../middleware/auth')
const ownerAuth=require('../../middleware/ownerAuth')
router.get("/get-bookings",trimRequest.all,ownerAuth,controller.bookingList)
router.post("/change-booking-status",trimRequest.all,ownerAuth,controller.changeBookingStatus)
router.get("/get-booking/:id",trimRequest.all,ownerAuth,controller.getSingleBooking)
router.post("/delete-bookings",trimRequest.all,ownerAuth,controller.deleteBookings)




module.exports = router;
