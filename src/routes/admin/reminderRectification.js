const express = require('express')
const router = express.Router()
const controller = require('../../controllers/admin/reminderRectification')
const trimRequest = require('trim-request')
const ownerAuth = require('../../middleware/ownerAuth')

router.get("/erroneous-reminders", trimRequest.all, ownerAuth, controller.listErroneousReminders)
router.get("/erroneous-reminders/:id/preview", trimRequest.all, ownerAuth, controller.previewRectificationEmail)
router.post("/erroneous-reminders/:id/send", trimRequest.all, ownerAuth, controller.sendRectificationEmail)

module.exports = router;
