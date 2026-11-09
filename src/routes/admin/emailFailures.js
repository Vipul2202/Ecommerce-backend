const express = require('express')
const router = express.Router()
const controller = require('../../controllers/admin/emailFailures')
const trimRequest = require('trim-request')
const ownerAuth = require('../../middleware/ownerAuth')

router.get("/email-failures", trimRequest.all, ownerAuth, controller.listEmailFailures)
router.post("/email-failures/:id/resend", trimRequest.all, ownerAuth, controller.resendEmailFailure)
router.post("/email-failures/:id/dismiss", trimRequest.all, ownerAuth, controller.dismissEmailFailure)

module.exports = router;
