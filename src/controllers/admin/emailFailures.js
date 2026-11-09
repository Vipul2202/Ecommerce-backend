// Owner-panel visibility into emails that every sending method (Zoho API,
// Resend) failed to deliver - see src/utils/sendemail.js, which is what
// actually records these.

const EmailFailure = require("../../models/emailFailure");
const { sendEmail } = require("../../utils/sendemail");
const utils = require("../../utils/utils");

exports.listEmailFailures = async (req, res) => {
  try {
    const onlyUnresolved = req.query.resolved !== "true";
    const query = onlyUnresolved ? { resolved: { $ne: true } } : {};

    const failures = await EmailFailure.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .select("-html"); // list view doesn't need the full email body

    return res.status(200).json({ total: failures.length, failures });
  } catch (error) {
    console.log(error);
    utils.handleError(res, error);
  }
};

exports.resendEmailFailure = async (req, res) => {
  try {
    const failure = await EmailFailure.findById(req.params.id);
    if (!failure) {
      return res.status(404).json({ message: "Email failure record not found" });
    }

    const sent = await sendEmail({
      to: failure.to,
      subject: failure.subject,
      html: failure.html,
    });

    if (!sent) {
      return res.status(502).json({ message: "Resend attempt also failed - check server logs for the new failure record" });
    }

    failure.resolved = true;
    failure.resolvedAt = new Date();
    await failure.save();

    return res.status(200).json({ message: "Email resent successfully", failure });
  } catch (error) {
    console.log(error);
    utils.handleError(res, error);
  }
};

exports.dismissEmailFailure = async (req, res) => {
  try {
    const failure = await EmailFailure.findByIdAndUpdate(
      req.params.id,
      { resolved: true, resolvedAt: new Date() },
      { new: true }
    );
    if (!failure) {
      return res.status(404).json({ message: "Email failure record not found" });
    }
    return res.status(200).json({ message: "Dismissed", failure });
  } catch (error) {
    console.log(error);
    utils.handleError(res, error);
  }
};
