const Reflection = require("../models/Reflection");

exports.saveReflection = async (req, res) => {
  try {
    const { month, reflection, affirmation } = req.body;

    let existing = await Reflection.findOne({
      userId: req.user.id,
      month
    });

    if (existing) {
      existing.reflection = reflection;
      existing.affirmation = affirmation;

      await existing.save();

      return res.json(existing);
    }

    const newReflection =
      await Reflection.create({
        userId: req.user.id,
        month,
        reflection,
        affirmation
      });

    res.status(201).json(newReflection);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};

exports.getAllReflections = async (req, res) => {
  try {
    const reflections = await Reflection.find({
      userId: req.user.id
    });

    res.json(reflections);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};

exports.getReflection = async (req, res) => {
  try {
    const reflection =
      await Reflection.findOne({
        userId: req.user.id,
        month: req.params.month
      });

    res.json(reflection);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};