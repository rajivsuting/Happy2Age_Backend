const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const caspSchema = new Schema({
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
  }
});

const CASP = mongoose.model("CASP", caspSchema);
module.exports = CASP;
