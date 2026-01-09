import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet"; // Security headers
import dotenv from "dotenv"; // Load environment variables

// Load .env file contents into process.env
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet()); // Add security headers (prevents common attacks)
app.use(morgan("dev"));

// 1. Health Check Route
app.get("/", (req, res) => {
  res.json({ message: "Server is running! 🚀" });
});

// Start the Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});