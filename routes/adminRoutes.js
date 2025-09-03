const express = require("express");
const {
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  changePassword,
  toggleAdminStatus,
  deleteAdmin,
} = require("../controllers/adminController");
const authenticate = require("../middlewares/authenticate");

const routes = express.Router();

// All routes require authentication
routes.use(authenticate);

// Get all admins
routes.get("/", getAllAdmins);

// Get single admin by ID
routes.get("/:id", getAdminById);

// Create new admin
routes.post("/", createAdmin);

// Update admin
routes.put("/:id", updateAdmin);

// Change admin password
routes.put("/:id/password", changePassword);

// Toggle admin status (enable/disable)
routes.put("/:id/status", toggleAdminStatus);

// Delete admin (soft delete)
routes.delete("/:id", deleteAdmin);

module.exports = routes;
