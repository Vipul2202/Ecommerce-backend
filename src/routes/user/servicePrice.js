const express = require("express");
const router = express.Router();
const controller = require("../../controllers/user/servicePrice");
const trimRequest = require("trim-request");

router.get("/get-service-prices", trimRequest.all, controller.getServicePrices);

module.exports = router;
