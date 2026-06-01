const express = require("express");
const router = express.Router();

const authMiddleware =
  require("../middleware/authMiddleware");

const reflectionController =
  require("../controllers/reflectionController");

router.post(
  "/",
  authMiddleware,
  reflectionController.saveReflection
);

router.get(
  "/",
  authMiddleware,
  reflectionController.getAllReflections
);

router.get(
  "/:month",
  authMiddleware,
  reflectionController.getReflection
);

module.exports = router;