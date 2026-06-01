const mongoose = require("mongoose");

const reflectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  month: String,

  reflection: String,

  affirmation: String
});

module.exports = mongoose.model(
  "Reflection",
  reflectionSchema
);