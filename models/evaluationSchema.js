const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const evaluationSchema = new Schema({
  cohort: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cohort",
    required: true,
  },

  participant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Participant",
  },

  activity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Activity",
    required: true,
  },

  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Session",
    required: true,
  },
  domain: {
    type: Array,
  },

  grandAverage: {
    type: Number,
    default: 0,
  },
});

const Evaluation = mongoose.model("Evaluation", evaluationSchema);
module.exports = Evaluation;
