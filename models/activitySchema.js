const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const activitySchema = new Schema({
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
});
const Activity = mongoose.model("Activity", activitySchema);

module.exports = Activity;
