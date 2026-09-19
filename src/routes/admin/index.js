const express = require('express')
const router = express.Router()
router.use(require('./booking'))
router.use(require('./category'))
router.use(require('./product'))

router.use(require('./order'))
router.use(require('./reminderRectification'))
router.use(require('./reminderActivity'))


module.exports = router