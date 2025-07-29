const express = require("express");
const AdminSchema = require("../models/Admin");

const routes = express.Router();

const {
  register,
  login,
  allUser,
  deleteUser,
  logout,
  refreshToken,
} = require("../controllers/authController");
const authenticate = require("../middlewares/authenticate");

routes.post("/register", register);
routes.post("/login", login);
routes.post("/logout", logout);
routes.get("/alluser", allUser);
routes.post("/refresh", refreshToken);
routes.get("/verify", authenticate, async (req, res) => {
  try {
    console.log("Verify endpoint called");
    console.log("User from token:", req.user);

    const admin = await AdminSchema.findById(req.user.id).select(
      "-password -salt"
    );
    console.log("Admin found:", admin);

    if (!admin || admin.removed || !admin.enabled) {
      console.log("Admin not found or disabled");
      return res
        .status(401)
        .json({ success: false, message: "User not found or disabled" });
    }

    console.log("Admin verified successfully");
    res.status(200).json({
      success: true,
      message: "User verified",
      user: {
        id: admin._id,
        name: `${admin.firstName} ${admin.lastName}`,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("Verify endpoint error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
routes.delete("/deleteuser/:adminid", deleteUser);

module.exports = routes;
