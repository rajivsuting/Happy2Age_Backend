const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const activitySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    references: {
      type: String,
      trim: true,
    },
    primaryDomain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain",
      required: true,
    },
    secondaryDomain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Domain",
    },
  },
  { timestamps: true }
);

const Activity = mongoose.model("Activity", activitySchema);

module.exports = Activity;
