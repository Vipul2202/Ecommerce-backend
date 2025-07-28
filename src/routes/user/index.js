const express = require('express')
const router = express.Router()

router.use(require('./user'))
router.use(require('./booking'))
router.use(require('./product'))
router.use(require('./cart'))
router.use(require('./order'))

router.use(require('./category'))

module.exports = router