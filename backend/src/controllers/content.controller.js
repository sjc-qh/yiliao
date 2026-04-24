import * as contentService from "../services/content.service.js";
import { fail, ok } from "../utils/response.js";

export async function getPublicCategories(_req, res) {
  try {
    return ok(res, await contentService.getPublicCategories());
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getPublicVideos(req, res) {
  try {
    return ok(res, await contentService.getPublicVideos(req.query));
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getPublicVideoById(req, res) {
  try {
    return ok(res, await contentService.getPublicVideoById(Number(req.params.id)));
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function createCategory(req, res) {
  try {
    return ok(res, await contentService.createCategory(req.body), "分类创建成功", 201);
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getAdminCategories(req, res) {
  try {
    return ok(res, await contentService.getAdminCategories(req.query));
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function createVideo(req, res) {
  try {
    return ok(res, await contentService.createVideo(req.body), "视频创建成功", 201);
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getAdminVideos(req, res) {
  try {
    return ok(res, await contentService.getAdminVideos(req.query));
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getAdminVideoById(req, res) {
  try {
    return ok(res, await contentService.getAdminVideoById(Number(req.params.id)));
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function updateVideo(req, res) {
  try {
    return ok(res, await contentService.updateVideo(Number(req.params.id), req.body), "视频更新成功");
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function updateVideoStatus(req, res) {
  try {
    return ok(
      res,
      await contentService.updateVideoStatus(Number(req.params.id), req.body.status),
      "视频状态更新成功",
    );
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}
