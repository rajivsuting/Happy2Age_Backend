const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const scheduledActivitySchema = new Schema(
  {
    activity: {
      type: Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    cohort: {
      type: Schema.Types.ObjectId,
      ref: "Cohort",
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient date-based queries
scheduledActivitySchema.index({ date: 1, cohort: 1 });

const ScheduledActivity = mongoose.model(
  "ScheduledActivity",
  scheduledActivitySchema
);

module.exports = ScheduledActivity;
