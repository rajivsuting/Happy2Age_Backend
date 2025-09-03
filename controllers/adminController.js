const AdminSchema = require("../models/Admin");
const { generate: uniqueId } = require("shortid");
const bcrypt = require("bcryptjs");
const logger = require("../log/logger");

// Get all admins (excluding removed ones)
const getAllAdmins = async (req, res) => {
  try {
    const admins = await AdminSchema.find({ removed: false })
      .select("-password -salt -emailToken")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: admins,
      message: "Admins retrieved successfully",
    });
  } catch (error) {
    logger.error("Error fetching admins", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get single admin by ID
const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await AdminSchema.findOne({ _id: id, removed: false }).select(
      "-password -salt -emailToken"
    );

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    res.status(200).json({
      success: true,
      data: admin,
      message: "Admin retrieved successfully",
    });
  } catch (error) {
    logger.error("Error fetching admin", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Create new admin
const createAdmin = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check if email already exists
    const existingAdmin = await AdminSchema.findOne({
      email: email.toLowerCase(),
      removed: false,
    });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "An admin with this email already exists",
      });
    }

    // Generate salt and hash password
    const salt = uniqueId();
    const hashPassword = bcrypt.hashSync(salt + password);
    const emailToken = uniqueId();

    // Create admin
    const admin = await AdminSchema.create({
      email: email.toLowerCase(),
      firstName,
      lastName,
      password: hashPassword,
      salt,
      emailToken,
      enabled: true,
      removed: false,
    });

    // Return admin without sensitive data
    const adminResponse = {
      _id: admin._id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      enabled: admin.enabled,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    };

    res.status(201).json({
      success: true,
      data: adminResponse,
      message: "Admin created successfully",
    });
  } catch (error) {
    logger.error("Error creating admin", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Update admin
const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, enabled } = req.body;

    // Check if admin exists
    const existingAdmin = await AdminSchema.findOne({
      _id: id,
      removed: false,
    });
    if (!existingAdmin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== existingAdmin.email) {
      const emailExists = await AdminSchema.findOne({
        email: email.toLowerCase(),
        _id: { $ne: id },
        removed: false,
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "An admin with this email already exists",
        });
      }
    }

    // Update admin
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email.toLowerCase();
    if (typeof enabled === "boolean") updateData.enabled = enabled;

    const updatedAdmin = await AdminSchema.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password -salt -emailToken");

    res.status(200).json({
      success: true,
      data: updatedAdmin,
      message: "Admin updated successfully",
    });
  } catch (error) {
    logger.error("Error updating admin", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Change admin password
const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password is required",
      });
    }

    // Check if admin exists
    const existingAdmin = await AdminSchema.findOne({
      _id: id,
      removed: false,
    });
    if (!existingAdmin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Generate new salt and hash password
    const salt = uniqueId();
    const hashPassword = bcrypt.hashSync(salt + newPassword);

    // Update password
    await AdminSchema.findByIdAndUpdate(id, {
      password: hashPassword,
      salt: salt,
    });

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    logger.error("Error changing password", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Disable/Enable admin (soft delete)
const toggleAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Enabled status must be a boolean value",
      });
    }

    // Check if admin exists
    const existingAdmin = await AdminSchema.findOne({
      _id: id,
      removed: false,
    });
    if (!existingAdmin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Update admin status
    const updatedAdmin = await AdminSchema.findByIdAndUpdate(
      id,
      { enabled: enabled },
      { new: true }
    ).select("-password -salt -emailToken");

    res.status(200).json({
      success: true,
      data: updatedAdmin,
      message: `Admin ${enabled ? "enabled" : "disabled"} successfully`,
    });
  } catch (error) {
    logger.error("Error toggling admin status", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Delete admin (soft delete)
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if admin exists
    const existingAdmin = await AdminSchema.findOne({
      _id: id,
      removed: false,
    });
    if (!existingAdmin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Soft delete admin
    await AdminSchema.findByIdAndUpdate(id, { removed: true });

    res.status(200).json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting admin", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  changePassword,
  toggleAdminStatus,
  deleteAdmin,
};
