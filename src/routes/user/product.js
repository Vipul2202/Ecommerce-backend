const express=require('express')
const router=express.Router()
const controller = require('../../controllers/user/product')
const trimRequest =require('trim-request')


router.get("/get-products",trimRequest.all,controller.getProducts)
router.get("/get-product/:id",trimRequest.all,controller.getProduct)
router.get("/get-categories",trimRequest.all,controller.getCategories)

module.exports = router;