require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

connectDB();

app.use(cors({
  origin: "http://localhost:8080",
  credentials: true
}));

app.use(express.json());

const PORT = process.env.PORT || 5000;

app.use(
  "/api/reflections",
  require("./routes/reflectionRoutes")
);

app.use(
  "/api/completions",
  require("./routes/completionRoutes")
);

app.use(
  "/api/habits",
  require("./routes/habitRoutes")
);

app.use(
  "/api/auth",
  require("./routes/authRoutes")
);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});