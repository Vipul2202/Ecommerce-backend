const ServicePrice = require("../../models/servicePrice");
const utils = require("../../utils/utils");

exports.listServicePrices = async (req, res) => {
  try {
    const prices = await ServicePrice.find().sort({ category: 1, key: 1 });
    return res.status(200).json({ prices });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.updateServicePrice = async (req, res) => {
  try {
    const { key } = req.params;
    const existing = await ServicePrice.findOne({ key });
    if (!existing) {
      return res.status(404).json({ message: "Unknown service" });
    }

    const toNumberOrNull = (value) => {
      if (value === null || value === undefined || value === "") return null;
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };

    if (existing.category === "tier") {
      existing.sedan = toNumberOrNull(req.body.sedan);
      existing.suv = toNumberOrNull(req.body.suv);
      existing.fourWd = toNumberOrNull(req.body.fourWd);
    } else {
      existing.flatPrice = toNumberOrNull(req.body.flatPrice);
      if (typeof req.body.quoteOnly === "boolean") {
        existing.quoteOnly = req.body.quoteOnly;
      }
    }

    await existing.save();
    return res.status(200).json({ message: "Price updated", price: existing });
  } catch (error) {
    utils.handleError(res, error);
  }
};
