const express = require('express')
const router = express.Router()
router.use(require('./booking'))
router.use(require('./category'))
router.use(require('./product'))

router.use(require('./order'))


module.exports = router