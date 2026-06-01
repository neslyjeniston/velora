const Completion = require("../models/Completion");

exports.toggleCompletion = async (req, res) => {
  try {
    const { habitId, date } = req.body;

    const existing = await Completion.findOne({
      userId: req.user.id,
      habitId,
      date
    });

    if (existing) {
      await existing.deleteOne();

      return res.json({
        completed: false
      });
    }

    const completion =
      await Completion.create({
        userId: req.user.id,
        habitId,
        date,
        completed: true
      });

    res.json({
      completed: true,
      completion
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};

exports.getCompletions = async (req, res) => {
  try {
    const completions =
      await Completion.find({
        userId: req.user.id
      });

    res.json(completions);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};