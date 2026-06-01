const mongoose = require("mongoose");

const completionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  habitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Habit"
  },

  date: String,

  completed: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model(
  "Completion",
  completionSchema
);