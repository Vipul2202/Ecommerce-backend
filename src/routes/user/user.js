const express=require('express')
const router=express.Router()
const controller = require('../../controllers/user/user.controller')
const trimRequest =require('trim-request')
const Auth=require('../../middleware/auth')

router.post(
    "/register",
    trimRequest.all,
    controller.register
)
router.post("/updateinfo",Auth,trimRequest.all,controller.updateinfo)
router.post(
    "/login",
    trimRequest.all,
    controller.login
)
router.post(
    "/forgot-password",
    trimRequest.all,
    controller.forgotPassword
)

router.post(
    "/reset-password",
    trimRequest.all,
    controller.resetPassword
)
router.get("/country-basic-list",controller.countryBasicList)

router.post("/upload-media",trimRequest.all,controller.uploadMedia)
router.get("/get-profile",Auth,trimRequest.all,controller.getProfile)
router.put("/update-profile",Auth,trimRequest.all,controller.updateProfile)
router.post("/change-password",Auth,trimRequest.all,controller.changePassword)


module.exports = router;
