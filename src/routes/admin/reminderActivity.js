const express = require('express')
const router = express.Router()
const controller = require('../../controllers/admin/reminderActivity')
const trimRequest = require('trim-request')
const ownerAuth = require('../../middleware/ownerAuth')

router.get("/reminders/recent", trimRequest.all, ownerAuth, controller.listRecentReminders)
router.get("/reminders/:id/sent-preview", trimRequest.all, ownerAuth, controller.previewSentReminder)

module.exports = router;
