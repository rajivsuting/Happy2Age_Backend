const AdminSchema = require("../models/Admin");
const { generate: uniqueId } = require("shortid");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const shortid = require("shortid");
const logger = require("../log/logger");

const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existingAdmin = await AdminSchema.find({
      email: email,
      removed: false,
    });

    if (existingAdmin.length > 0) {
      return res
        .status(400)
        .json({ message: "An account already exists with the email" });
    }

    const salt = uniqueId();
    const hashPassword = bcrypt.hashSync(salt + password);
    const emailToken = uniqueId();

    const admin = await AdminSchema.create({
      email,
      firstName,
      lastName,
      password: hashPassword,
      salt,
      emailToken,
    });

    if (!admin) {
      res.status(400).json({ message: "An error occured" });
    }

    res.status(200).json({ admin });
  } catch (err) {
    logger.error("Error creating admin", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const createTokens = (admin) => {
  const payload = { id: admin._id, role: "admin" };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

// const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Email and password are required." });
//     }

//     const admin = await AdminSchema.findOne({
//       email,
//       removed: false,
//       enabled: true,
//     });

//     if (!admin) {
//       return res
//         .status(401)
//         .json({ success: false, message: "Invalid credentials." });
//     }

//     const isValid = await bcrypt.compare(admin.salt + password, admin.password);
//     if (!isValid) {
//       return res
//         .status(401)
//         .json({ success: false, message: "Invalid credentials." });
//     }

//     const { accessToken, refreshToken } = createTokens(admin);
//     const isProduction = process.env.NODE_ENV === "production";

//     // Set cookies
//     res.cookie("accessToken", accessToken, {
//       httpOnly: true,
//       secure: isProduction,
//       sameSite: isProduction ? "None" : "Lax",
//       maxAge: 3600000, // 1 hour
//     });

//     res.cookie("refreshToken", refreshToken, {
//       httpOnly: true,
//       secure: isProduction,
//       sameSite: isProduction ? "None" : "Lax",
//       maxAge: 3600000 * 24 * 7, // 7 days
//     });

//     res.status(200).json({
//       success: true,
//       message: "Admin logged in successfully.",
//       user: {
//         id: admin._id,
//         name: admin.name,
//         email: admin.email,
//       },
//       token: accessToken,
//     });
//   } catch (error) {
//     console.error("Admin Login Error:", error);
//     res.status(500).json({ success: false, message: "Internal server error." });
//   }
// };

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const admin = await AdminSchema.findOne({
      email,
      removed: false,
      enabled: true,
    });

    if (!admin) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials." });
    }

    const isValid = await bcrypt.compare(admin.salt + password, admin.password);
    if (!isValid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials." });
    }

    const { accessToken, refreshToken } = createTokens(admin);
    const isProduction = process.env.NODE_ENV === "production";

    // Safari-compatible cookie settings
    const cookieOptions = {
      httpOnly: true,
      path: "/",
      maxAge: 3600000, // 1 hour
    };

    const refreshCookieOptions = {
      httpOnly: true,
      path: "/",
      maxAge: 3600000 * 24 * 7, // 7 days
    };

    // Only add secure and sameSite in production
    if (isProduction) {
      cookieOptions.secure = true;
      cookieOptions.sameSite = "None";
      refreshCookieOptions.secure = true;
      refreshCookieOptions.sameSite = "None";
    }

    // Set cookies
    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

    return res.status(200).json({
      success: true,
      message: "Admin logged in successfully.",
      user: {
        id: admin._id,
        name: `${admin.firstName} ${admin.lastName}`,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
      },
      // Include tokens for localStorage (non-sensitive data)
      tokens: {
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresAt: Date.now() + 3600000, // 1 hour from now
      },
    });
  } catch (error) {
    console.error("Admin Login Error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is required.",
      });
    }

    // Verify the refresh token
    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET,
      async (error, decoded) => {
        if (error) {
          // Clear existing cookies if refresh token is invalid
          res.clearCookie("accessToken");
          res.clearCookie("refreshToken");

          return res.status(401).json({
            success: false,
            message: "Invalid or expired refresh token, please log in again.",
          });
        }

        try {
          // Find the admin by id from the decoded token
          const admin = await AdminSchema.findOne({
            _id: decoded.id,
            removed: false,
            enabled: true,
          });

          if (!admin) {
            res.clearCookie("accessToken");
            res.clearCookie("refreshToken");

            return res.status(401).json({
              success: false,
              message: "Admin not found or disabled.",
            });
          }

          // Generate new tokens
          const { accessToken, refreshToken: newRefreshToken } =
            createTokens(admin);
          const isProduction = process.env.NODE_ENV === "production";

          // Set new cookies with Safari-compatible settings
          const cookieOptions = {
            httpOnly: true,
            path: "/",
            maxAge: 3600000, // 1 hour
          };

          const refreshCookieOptions = {
            httpOnly: true,
            path: "/",
            maxAge: 3600000 * 24 * 7, // 7 days
          };

          // Only add secure and sameSite in production
          if (isProduction) {
            cookieOptions.secure = true;
            cookieOptions.sameSite = "None";
            refreshCookieOptions.secure = true;
            refreshCookieOptions.sameSite = "None";
          }

          res.cookie("accessToken", accessToken, cookieOptions);
          res.cookie("refreshToken", newRefreshToken, refreshCookieOptions);

          return res.status(200).json({
            success: true,
            message: "Tokens refreshed successfully.",
            token: accessToken,
            // Include new tokens for localStorage
            tokens: {
              accessToken: accessToken,
              refreshToken: newRefreshToken,
              expiresAt: Date.now() + 3600000, // 1 hour from now
            },
          });
        } catch (adminError) {
          console.error("Admin Lookup Error:", adminError);
          return res.status(500).json({
            success: false,
            message: "Internal server error during token refresh.",
          });
        }
      }
    );
  } catch (error) {
    console.error("Token Refresh Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

const logout = (req, res) => {
  console.log("Logout");

  const isProduction = process.env.NODE_ENV === "production";

  // Safari-compatible cookie clearing
  const clearOptions = {
    httpOnly: true,
    path: "/",
  };

  if (isProduction) {
    clearOptions.secure = true;
    clearOptions.sameSite = "None";
  }

  res.clearCookie("accessToken", clearOptions);
  res.clearCookie("refreshToken", clearOptions);

  res.status(200).json({ message: "User logged out successfully" });
};

const allUser = async (req, res) => {
  try {
    const allData = await AdminSchema.find();
    res.status(200).json({ success: true, message: allData });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internet server error" });
  }
};

const deleteUser = async (req, res) => {
  const { adminid } = req.params;

  try {
    const allData = await AdminSchema.findByIdAndDelete({ _id: adminid });
    res.status(200).json({ success: true, message: allData });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internet server error" });
  }
};

const testCookies = (req, res) => {
  try {
    // Set a simple test cookie
    res.cookie("testCookie", "testValue", {
      httpOnly: true,
      path: "/",
      maxAge: 3600000, // 1 hour
    });

    // Return current cookies and detailed info
    res.status(200).json({
      success: true,
      message: "Test cookie set",
      cookies: req.cookies,
      headers: req.headers,
      cookieHeader: req.headers.cookie,
      origin: req.headers.origin,
      referer: req.headers.referer,
      userAgent: req.headers["user-agent"],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Test cookie error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error setting test cookie" });
  }
};

const checkCookies = (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Current cookies",
      cookies: req.cookies,
      cookieHeader: req.headers.cookie,
      origin: req.headers.origin,
      referer: req.headers.referer,
      userAgent: req.headers["user-agent"],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Check cookie error:", error);
    res.status(500).json({ success: false, message: "Error checking cookies" });
  }
};

module.exports = {
  register,
  login,
  allUser,
  deleteUser,
  logout,
  refreshToken,
  testCookies,
  checkCookies,
};
