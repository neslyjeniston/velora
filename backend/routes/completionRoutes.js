const express = require("express");
const router = express.Router();

const authMiddleware =
  require("../middleware/authMiddleware");

const completionController =
  require("../controllers/completionController");

router.get(
  "/",
  authMiddleware,
  completionController.getCompletions
);

router.post(
  "/toggle",
  authMiddleware,
  completionController.toggleCompletion
);

module.exports = router;