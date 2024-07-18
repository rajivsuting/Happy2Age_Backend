const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const mocaSchema = new Schema({
  participant: {
    type: Schema.Types.ObjectId,
    ref: "Participant",
    required: true,
  },
  questions: {
    type: Array,
  },
  date:{
    type:Date
  },
  totalScore : {
    type:Number
  },
});

const moca = mongoose.model("MocaTest", mocaSchema);
module.exports = moca;
