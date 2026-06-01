const Habit = require("../models/Habit");

exports.getHabits = async (req, res) => {
  try {
    const habits = await Habit.find({
      userId: req.user.id,
    });

    res.json(habits);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.createHabit = async (req, res) => {
  try {
    const { name, category } = req.body;

    const habit = await Habit.create({
      userId: req.user.id,
      name,
      category,
    });

    res.status(201).json(habit);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.deleteHabit = async (req, res) => {
  try {
    await Habit.deleteOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    res.json({
      message: "Habit deleted",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};