const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const subTopic = new Schema({
  content: {
    type: String,
    required: true,
    trim: true,
  },
  score: {
    type: Number,
    default: 0,
  },
});

const domainSchema = new Schema({
  category: {
    type: String,
  },

  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ["General", "Special Need"],
    trim: true,
  },
  subTopics: [subTopic],
  observation: {
    type: String,
    trim: true,
  },
  average: {
    type: Number,
    default: 0,
    trim: true,
  },

  conducted: {
    type: Boolean,
  },
});

const Domain = mongoose.model("Domain", domainSchema);
module.exports = Domain;
