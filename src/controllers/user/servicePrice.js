const ServicePrice = require("../../models/servicePrice");
const utils = require("../../utils/utils");

// Public, unauthenticated — the live website fetches current prices from
// here so an owner-panel price change shows up on the site immediately,
// without a redeploy.
exports.getServicePrices = async (req, res) => {
  try {
    const prices = await ServicePrice.find().select("-__v");
    return res.status(200).json({ prices });
  } catch (error) {
    utils.handleError(res, error);
  }
};
