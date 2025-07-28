const express=require('express')
const router=express.Router()
const controller = require('../../controllers/user/cart')
const trimRequest =require('trim-request')
const Auth=require('../../middleware/auth')
router.post("/add-to-cart",Auth,trimRequest.all,controller.addProductToCart)
router.get("/remove-from-cart/:id",Auth,trimRequest.all,controller.removeProductFromCart)
router.get("/get-cart",Auth,trimRequest.all,controller.getCart)
module.exports = router;