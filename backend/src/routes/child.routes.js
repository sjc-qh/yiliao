import express from "express";

import * as childController from "../controllers/child.controller.js";
import { authenticateToken } from "../middlewares/auth.js";
import { requireRoles } from "../middlewares/role.js";

const router = express.Router();

router.use(authenticateToken, requireRoles("child"));

router.get("/profile", childController.getChildProfile);
router.get("/elders", childController.getMyElders);
router.post("/elders/:elderId/reminders", childController.sendTrainingReminder);
router.get("/elders/:elderId/reminders/latest", childController.getLatestReminder);
router.get("/elders/:elderId/today-summary", childController.getChildTodaySummary);
router.get("/elders/:elderId/records", childController.getChildTrainingRecords);
router.get("/elders/:elderId/training-records/:recordId", childController.getChildTrainingRecordDetail);
router.get("/elders/:elderId/training-trend", childController.getChildTrainingTrend);
router.get("/elders/:elderId/weekly-summary", childController.getChildWeeklySummary);

export default router;
