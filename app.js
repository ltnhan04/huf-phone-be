const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const connectDB = require("./libs/db");

const authRoutes = require("./routes/auth.route");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
const corsOptions = {
  origin: "http://localhost:3000/",
  methods: ["GET", "POST", "PUT", "DELETE"],
};
app.use(cors(corsOptions));

app.use("/api/auth", authRoutes);

app.get("/", () => {
  console.log("Hello World");
});
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  connectDB();
});
