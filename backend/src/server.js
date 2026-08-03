const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth.routes");
const instagramRoutes = require("./routes/instagram.routes");
const automationRoutes = require("./routes/automation.routes");
const webhookRoutes = require("./routes/webhook.routes");

const app = express();
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://justdms.in",
  "https://www.justdms.in",
  process.env.FRONTEND_URL,
].filter(Boolean);

/**
 * =============================
 * MIDDLEWARES
 * =============================
 */
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

// Required for Meta webhooks (safe even if unused)
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

/**
 * =============================
 * ROUTES
 * =============================
 */
app.use("/auth", authRoutes);
app.use("/instagram", instagramRoutes);
app.use("/automation", automationRoutes);
app.use("/webhook", webhookRoutes);

/**
 * =============================
 * HEALTH CHECK
 * =============================
 */
app.get("/", (req, res) => {
  res.status(200).send("Backend running");
});

/**
 * =============================
 * SERVER START
 * =============================
 */
const PORT = Number(process.env.PORT || 5001);
const HOST = process.env.HOST || "127.0.0.1";

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Backend running on http://${HOST}:${PORT}`);
});

server.on("error", (error) => {
  console.error("❌ Backend listen error:", error);
  process.exitCode = 1;
});
