import express from "express";

import * as trainingController from "../controllers/training.controller.js";
import { authenticateToken } from "../middlewares/auth.js";

const router = express.Router();

router.get("/categories", trainingController.getCategories);
router.get("/videos", trainingController.getVideos);
router.get("/videos/:id", trainingController.getVideoDetail);
router.get("/today-plan", authenticateToken, trainingController.getTodayPlan);
router.get("/training-records", authenticateToken, trainingController.getTrainingRecords);
router.post("/training-records", authenticateToken, trainingController.createTrainingRecord);

export default router;
