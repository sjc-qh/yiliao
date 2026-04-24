import express from "express";

import * as elderController from "../controllers/elder.controller.js";
import { authenticateToken } from "../middlewares/auth.js";
import { requireRoles } from "../middlewares/role.js";

const router = express.Router();

router.use(authenticateToken, requireRoles("elder"));

router.get("/profile", elderController.getElderProfile);
router.get("/home", elderController.getElderHome);
router.get("/notifications", elderController.getNotifications);
router.post("/notifications/:id/read", elderController.markNotificationRead);
router.get("/today-plan", elderController.getTodayPlan);
router.post("/today-plan/generate", elderController.generateTodayPlan);
router.post("/today-plan/activate-template", elderController.activateTodayTemplate);
router.post("/today-plan/items/:id/complete", elderController.completeTodayPlanItem);
router.post("/today-plan/items/:id/skip", elderController.skipTodayPlanItem);
router.get("/training-records", elderController.getTrainingRecords);
router.get("/training-records/:id", elderController.getTrainingRecordDetail);
router.get("/training-trend", elderController.getTrainingTrend);
router.post("/training-records/start", elderController.startTrainingRecord);
router.post("/training-records/:id/finish", elderController.finishTrainingRecord);

export default router;
