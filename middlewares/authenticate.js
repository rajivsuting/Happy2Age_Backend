const jwt = require("jsonwebtoken");
const logger = require("../log/logger");
require("dotenv/config");
const User = require("../models/Admin");

const authenticate = async (req, res, next) => {
  const token = req.cookies.token;
console.log("token",token);
  try {
    if (!token) {
      return res
        .status(401)
        .json({ success: false, jwtExpired: true, message: "Unauthorized" });
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    // console.log(verified);
    if (!verified) {
      return res.status(401).json({
        success: false,
        jwtExpired: true,
        message: "Token verification failed, authorization denied.",
      });
    }

    const user = await User.findOne({
      _id: verified.id,
      removed: false,
    });

    if (!user)
      return res.status(401).json({
        success: false,
        jwtExpired: true,
        message: "User doesn't Exist, authorization denied.",
      });

    const { loggedSessions } = user;

    if (!loggedSessions.includes(token))
      return res.status(401).json({
        success: false,
        jwtExpired: true,
        message: "User is already logout try to login, authorization denied.",
      });
    else {
      req["admin"] = user;
      next();
    }
  } catch (error) {
    logger.error("Error verifing token", error);
    return res.status(503).json({
      success: false,
      jwtExpired: true,
      error: "Internal server error",
    });
  }
};

module.exports = authenticate;
