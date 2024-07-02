const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// const questionSchema = new Schema({
//   question: {
//     type: String,
//     required: true,
//     trim: true,
//   },
//   isReverse: {
//     type: Boolean,
//     trim: true,
//   },
//   score: {
//     type: Number,
//   },
// });

const oxfordHappiness = new Schema({
  participant: {
    type: Schema.Types.ObjectId,
    ref: "Participant",
    required: true,
  },
  questions: { type: Array },
  happinessScore: {
    type: Number,
    trim: true,
  },
  date:{
    type:Date
  }
});

const oxford = mongoose.model("OxfordHappiness", oxfordHappiness);

module.exports = oxford;
