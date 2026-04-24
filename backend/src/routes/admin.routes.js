import express from "express";

import * as adminController from "../controllers/admin.controller.js";
import { authenticateToken } from "../middlewares/auth.js";
import { requireRoles } from "../middlewares/role.js";

const router = express.Router();

router.use(authenticateToken, requireRoles("admin"));

router.get("/profile", adminController.getAdminProfile);
router.post("/users", adminController.createUser);
router.get("/users", adminController.getUsers);
router.patch("/users/:id/status", adminController.updateUserStatus);
router.post("/bindings", adminController.createBinding);
router.get("/bindings", adminController.getBindings);
router.delete("/bindings/:id", adminController.deleteBinding);
router.post("/categories", adminController.createCategory);
router.get("/categories", adminController.getAdminCategories);
router.post("/videos", adminController.createVideo);
router.get("/videos", adminController.getAdminVideos);
router.get("/videos/:id", adminController.getAdminVideoById);
router.put("/videos/:id", adminController.updateVideo);
router.patch("/videos/:id/status", adminController.updateVideoStatus);
router.post("/templates", adminController.createTemplate);
router.get("/templates", adminController.getTemplates);
router.get("/templates/:id", adminController.getTemplateDetail);
router.put("/templates/:id", adminController.updateTemplate);
router.post("/templates/:id/items", adminController.createTemplateItem);
router.put("/templates/:id/items/:itemId", adminController.updateTemplateItem);
router.delete("/templates/:id/items/:itemId", adminController.deleteTemplateItem);
router.post("/assignments", adminController.createAssignment);
router.get("/assignments", adminController.getAssignments);

export default router;
