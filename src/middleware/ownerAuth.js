const ownerAuth = (req, res, next) => {
  const password = req.headers["x-owner-password"];

  if (!password || password !== process.env.OWNER_PANEL_PASSWORD) {
    return res.status(401).json({ message: "Invalid owner panel password" });
  }

  next();
};

module.exports = ownerAuth;
