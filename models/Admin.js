const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const AdminSchema = new mongoose.Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please fill a valid email address",
    ],
  },

  firstName: {
    type: String,
    required: true,
    trim: true,
  },

  lastName: {
    type: String,
    required: true,
    trim: true,
  },

  photo: {
    type: String,
    trim: true,
  },

  password: {
    type: String,
    required: true,
    trim: true,
  },

  salt: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ["admin", "super_admin"],
    default: "admin",
    required: true,
  },

  emailToken: String,

  authType: {
    type: String,
    default: "email",
  },

  loggedSessions: {
    type: [String],
    default: [],
  },
});

AdminSchema.methods.generateHash = function (salt, password) {
  return bcrypt.hashSync(salt + password);
};

AdminSchema.methods.validPassword = function (salt, password) {
  return bcrypt.compareSync(salt + password, this.password);
};

module.exports = mongoose.model("AdminSchema", AdminSchema);
