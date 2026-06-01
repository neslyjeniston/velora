const express = require("express");
const router = express.Router();

const authMiddleware =
  require("../middleware/authMiddleware");

const habitController =
  require("../controllers/habitController");

router.get(
  "/",
  authMiddleware,
  habitController.getHabits
);

router.post(
  "/",
  authMiddleware,
  habitController.createHabit
);

router.delete(
  "/:id",
  authMiddleware,
  habitController.deleteHabit
);

module.exports = router;