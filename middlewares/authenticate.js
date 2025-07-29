const jwt = require("jsonwebtoken");
const logger = require("../log/logger");
require("dotenv/config");
const User = require("../models/Admin");

const authenticate = (req, res, next) => {
  console.log("Authenticate middleware called");
  console.log("Cookies:", req.cookies);
  console.log("Authorization header:", req.header("Authorization"));

  let token = req.header("Authorization");

  if (!token && req.cookies?.accessToken) {
    token = req.cookies.accessToken;
    console.log("Using token from cookies");
  }

  if (!token) {
    console.log("No token found");
    return res.status(401).json({ message: "Access denied." });
  }

  console.log("Token found:", token ? "Yes" : "No");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token decoded successfully:", decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.log("Token verification failed:", error.message);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token has expired." });
    }
    return res.status(400).json({ message: "Invalid token." });
  }
};

module.exports = authenticate;
