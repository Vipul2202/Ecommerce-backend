const express=require('express')
const router=express.Router()
const controller = require('../../controllers/admin/category')
const trimRequest =require('trim-request')

router.post("/create-category",trimRequest.all,controller.createCategory)
router.get("/get-categories",trimRequest.all,controller.getCategories)
router.delete("/delete-category/:id",trimRequest.all,controller.deleteCategory)
module.exports = router;