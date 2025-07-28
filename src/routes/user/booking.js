const express=require('express')
const router=express.Router()
const controller = require('../../controllers/user/booking')
const trimRequest =require('trim-request')
const Auth=require('../../middleware/auth')
router.post("/create-booking",trimRequest.all,controller.createBooking)
router.get("/confirm-booking/:id",trimRequest.all,controller.confirmBooking)



module.exports = router;
