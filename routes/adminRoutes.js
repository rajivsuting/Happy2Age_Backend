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
const {
  authenticate,
  requireSuperAdmin,
} = require("../middlewares/authenticate");

const routes = express.Router();

// All routes require authentication
routes.use(authenticate);

// Get all admins
routes.get("/", getAllAdmins);

// Get single admin by ID
routes.get("/:id", getAdminById);

// Create new admin - requires super admin
routes.post("/", requireSuperAdmin, createAdmin);

// Update admin - requires super admin
routes.put("/:id", requireSuperAdmin, updateAdmin);

// Change admin password - requires super admin
routes.put("/:id/password", requireSuperAdmin, changePassword);

// Toggle admin status (enable/disable) - requires super admin
routes.put("/:id/status", requireSuperAdmin, toggleAdminStatus);

// Delete admin (soft delete) - requires super admin
routes.delete("/:id", requireSuperAdmin, deleteAdmin);

module.exports = routes;
