const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const attendanceSchema = new Schema(
  {
    participant: {
      type: Schema.Types.ObjectId,
      ref: "Participant",
      required: true,
    },

    cohort: {
      type: Schema.Types.ObjectId,
      ref: "Cohort",
      required: true,
    },

    session: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },

    present: { type: Boolean, required: true, default: false },
    date:{type:Date}
  },
  { timestamps: true }
);

const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = Attendance;
