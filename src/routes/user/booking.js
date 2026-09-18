const express=require('express')
const router=express.Router()
const controller = require('../../controllers/user/booking')
const manageController = require('../../controllers/user/bookingManage')
const trimRequest =require('trim-request')
const Auth=require('../../middleware/auth')
router.post("/create-booking",trimRequest.all,controller.createBooking)
router.get("/confirm-booking/:id",trimRequest.all,controller.confirmBooking)

router.get("/manage-booking/:id",trimRequest.all,manageController.getManageBooking)
router.post("/manage-booking/:id/cancel",trimRequest.all,manageController.cancelBookingByCustomer)
router.post("/manage-booking/:id/reschedule",trimRequest.all,manageController.rescheduleBookingByCustomer)
router.get("/decline-reschedule/:id",trimRequest.all,manageController.declineReschedule)



module.exports = router;
