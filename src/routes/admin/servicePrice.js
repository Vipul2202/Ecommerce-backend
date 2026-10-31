const express = require("express");
const router = express.Router();
const controller = require("../../controllers/admin/servicePrice");
const trimRequest = require("trim-request");
const ownerAuth = require("../../middleware/ownerAuth");

router.get("/service-prices", trimRequest.all, ownerAuth, controller.listServicePrices);
router.put("/service-prices/:key", trimRequest.all, ownerAuth, controller.updateServicePrice);

module.exports = router;
