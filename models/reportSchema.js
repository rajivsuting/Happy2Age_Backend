const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Unified schema for all types of reports
const reportSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["cohort", "individual", "allCohorts"],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    pdfUrl: {
      type: String,
      required: true,
    },
    // Reference fields based on report type
    cohort: {
      type: Schema.Types.ObjectId,
      ref: "Cohort",
    },
    participant: {
      type: Schema.Types.ObjectId,
      ref: "Participant",
    },
    // Date range for the report
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    // Metadata about the report
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

const Report = mongoose.model("Report", reportSchema);

module.exports = Report;
