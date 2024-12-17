const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const participantSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,

      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please fill a valid email address",
      ],
    },

    phone: {
      type: String,
      required: true,
      match: [/^\d{10}$/, "Please fill a valid 10-digit phone number"],
    },

    dob: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },
    participantType: {
      type: String,
      enum: ["General", "Special Need"],
      required: true,
    },
    address: {
      addressLine: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      pincode: {
        type: String,
        required: true,
        match: [/^\d{6}$/, "Please fill a valid 6-digit PIN code"],
      },
    },
    cohort: {
      type: Schema.Types.ObjectId,
      ref: "Cohort",
    },
    briefBackground: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return v.split(" ").length <= 100; // Limit to 100 words
        },
        message: "Brief background must not exceed 100 words.",
      },
    },
    emergencyContact: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      relationship: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        required: true,
        match: [/^\d{10}$/, "Please fill a valid 10-digit phone number"],
      },
    },
  },
  {
    timestamps: true,
  }
);

participantSchema.index({ email: 1 });

const Participant = mongoose.model("Participant", participantSchema);
module.exports = Participant;
