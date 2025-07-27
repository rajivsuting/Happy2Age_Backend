const jwt = require("jsonwebtoken");
const logger = require("../log/logger");
require("dotenv/config");
const User = require("../models/Admin");

const authenticate = (req, res, next) => {
  let token = req.header("Authorization");

  if (!token && req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({ message: "Access denied." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token has expired." });
    }
    return res.status(400).json({ message: "Invalid token." });
  }
};

module.exports = authenticate;
