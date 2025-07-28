const express=require('express')
const router=express.Router()
const controller = require('../../controllers/admin/product')
const trimRequest =require('trim-request')

router.post("/create-product",trimRequest.all,controller.createProduct)
router.get("/get-products",trimRequest.all,controller.getProducts)
router.get("/get-product/:id",trimRequest.all,controller.getProduct)
router.get("/get-all-product",trimRequest.all,controller.getallProducts)
router.put("/update-product/:id",trimRequest.all,controller.updateProduct)
router.delete("/delete-product/:id",trimRequest.all,controller.deleteProduct)
module.exports = router;