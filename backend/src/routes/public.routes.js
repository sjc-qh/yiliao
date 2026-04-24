import express from "express";

import * as contentController from "../controllers/content.controller.js";

const router = express.Router();

router.get("/categories", contentController.getPublicCategories);
router.get("/videos", contentController.getPublicVideos);
router.get("/videos/:id", contentController.getPublicVideoById);

export default router;
