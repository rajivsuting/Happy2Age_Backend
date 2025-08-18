const jwt = require("jsonwebtoken");
const logger = require("../log/logger");
require("dotenv/config");
const User = require("../models/Admin");

const authenticate = (req, res, next) => {
  console.log("=== AUTHENTICATE MIDDLEWARE DEBUG ===");
  console.log("Authenticate middleware called");
  console.log("Cookies:", req.cookies);
  console.log("Authorization header:", req.header("Authorization"));
  console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);
  console.log(
    "JWT_SECRET length:",
    process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0
  );

  let token = req.header("Authorization");

  // Handle Bearer token format from localStorage
  if (token && token.startsWith("Bearer ")) {
    token = token.substring(7); // Remove "Bearer " prefix
    console.log("Using token from Authorization header (Bearer)");
  }

  if (!token && req.cookies?.accessToken) {
    token = req.cookies.accessToken;
    console.log("Using token from cookies");
  }

  if (!token) {
    console.log("No token found");
    return res.status(401).json({ message: "Access denied." });
  }

  console.log("Token found:", token ? "Yes" : "No");
  console.log("Token value:", token ? token.substring(0, 20) + "..." : "None");
  console.log("Token format check:", {
    hasToken: !!token,
    tokenLength: token ? token.length : 0,
    startsWithBearer: token ? token.startsWith("Bearer ") : false,
    isJWTFormat: token ? token.split(".").length === 3 : false,
  });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token decoded successfully:", decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.log("Token verification failed:", error.message);
    console.log("Error details:", {
      name: error.name,
      message: error.message,
      tokenLength: token ? token.length : 0,
      tokenStart: token ? token.substring(0, 20) : "None",
    });

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token has expired." });
    }
    return res.status(400).json({ message: "Invalid token." });
  }
};

module.exports = authenticate;
