import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import authRoutes from "./routes/auth.routes.js";
import publicRoutes from "./routes/public.routes.js";
import elderRoutes from "./routes/elder.routes.js";
import childRoutes from "./routes/child.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import trainingRoutes from "./routes/training.routes.js";
import { env } from "./config/env.js";
import { notFoundHandler } from "./middlewares/not-found.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/elder", elderRoutes);
app.use("/api/child", childRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/training", trainingRoutes);
app.use(notFoundHandler);

export default app;
