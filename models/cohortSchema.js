const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const cohortSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  participants: [
    {
      type: Schema.Types.ObjectId,
      ref: "Participant",
    },
  ],
  sessions: [
    {
      type: Schema.Types.ObjectId,
      ref: "Session",
    },
  ],
});

const Cohort = mongoose.model("Cohort", cohortSchema);

module.exports = Cohort;
