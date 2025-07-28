const jwt = require("jsonwebtoken");
const utils = require("../utils/utils");

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization header missing or malformed" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decrypted = utils.decrypt(token); // ✅ Decrypt first
    const decoded = jwt.verify(decrypted, process.env.JWT_SECRET); // ✅ Then verify
    console.log("decodedddd", decoded);

    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT error:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authenticateJWT;
