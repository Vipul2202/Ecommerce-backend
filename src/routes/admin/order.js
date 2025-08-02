const express=require('express')
const router=express.Router()
const controller = require('../../controllers/admin/order')
const trimRequest =require('trim-request')
const Auth=require('../../middleware/auth')

// router.get("/get-orders",Auth,trimRequest.all,controller.getAllOrders)
router.get("/get-orders",trimRequest.all,controller.getAllOrders)






module.exports = router;
