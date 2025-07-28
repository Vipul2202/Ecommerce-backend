const express=require('express')
const router=express.Router()
const controller = require('../../controllers/user/order')
const trimRequest =require('trim-request')
const Auth=require('../../middleware/auth')

router.post("/create-order",Auth,trimRequest.all,controller.placeOrder)
router.get("/get-my-orders",Auth,trimRequest.all,controller.getMyOrders)
// router.get("/get-order/:id",Auth,trimRequest.all,controller.getOrder)

module.exports = router;