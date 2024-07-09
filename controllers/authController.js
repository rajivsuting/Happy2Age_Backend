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

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await AdminSchema.findOne({
      email,
      removed: false,
      enabled: true,
    });

    // Check if admin exists and password matches
    if (
      !admin ||
      !(await bcrypt.compare(admin.salt + password, admin.password))
    ) {
      return res.status(403).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET, {
      expiresIn: req.body.remember ? 365 * 24 + "h" : "24h",
    });

    await AdminSchema.findByIdAndUpdate(
      { _id: admin._id },
      { $push: { loggedSessions: token } },
      { new: true }
    ).exec();

    res
      .status(200)
      .cookie("token", token, {
        maxAge: req.body.remember ? 365 * 24 * 60 * 60 * 1000 : null,
        sameSite: "Lax",
        httpOnly: true,
        secure: false,
        path: "/",
        domain: req.hostname,
        Partitioned: true,
      })
      .json({ token });
  } catch (error) {
    logger.error("Error logging in admin", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const logout = async (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization.split(" ")[1];

    if (!token) {
      return res.status(400).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adminId = decoded.id;

    const admin = await AdminSchema.findByIdAndUpdate(
      { _id: adminId },
      { $pull: { loggedSessions: token } },
      { new: true }
    );

    if (!admin) {
      return res.status(400).json({ message: "Admin not found" });
    }

    res
      .status(200)
      .clearCookie("token", {
        sameSite: "Lax",
        httpOnly: true,
        secure: false,
        path: "/",
        domain: req.hostname,
        Partitioned: true,
      })
      .json({ message: "Logged out successfully" });
  } catch (error) {
    logger.error("Error logging out admin", error);
    res.status(500).json({ message: "Internal server error" });
  }
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

module.exports = { register, login, allUser, deleteUser, logout };
