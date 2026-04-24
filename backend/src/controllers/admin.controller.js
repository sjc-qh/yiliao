import * as authService from "../services/auth.service.js";
import * as bindingService from "../services/binding.service.js";
import * as planService from "../services/plan.service.js";
import * as userService from "../services/user.service.js";
import { fail, ok } from "../utils/response.js";

export async function getAdminProfile(req, res) {
  try {
    return ok(res, await authService.getProfile(req.user.userId));
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function createUser(req, res) {
  try {
    return ok(res, await userService.createUser(req.body), "用户创建成功", 201);
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getUsers(req, res) {
  try {
    return ok(res, await userService.listUsers(req.query));
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function updateUserStatus(req, res) {
  try {
    return ok(
      res,
      await userService.updateUserStatus(req.user.userId, Number(req.params.id), req.body.status),
      "用户状态更新成功",
    );
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function createBinding(req, res) {
  try {
    return ok(res, await bindingService.createBinding(req.body), "绑定创建成功", 201);
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getBindings(req, res) {
  try {
    return ok(res, await bindingService.listBindings(req.query));
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function deleteBinding(req, res) {
  try {
    return ok(res, await bindingService.deleteBinding(Number(req.params.id)), "绑定删除成功");
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export {
  createCategory,
  createVideo,
  getAdminCategories,
  getAdminVideoById,
  getAdminVideos,
  updateVideo,
  updateVideoStatus,
} from "./content.controller.js";

export async function createTemplate(req, res) {
  try {
    return ok(res, await planService.createTemplate(req.body), "模板创建成功", 201);
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getTemplates(req, res) {
  try {
    return ok(res, await planService.listTemplates(req.query));
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getTemplateDetail(req, res) {
  try {
    return ok(res, await planService.getTemplateDetail(Number(req.params.id)));
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function updateTemplate(req, res) {
  try {
    return ok(res, await planService.updateTemplate(Number(req.params.id), req.body), "模板更新成功");
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function createTemplateItem(req, res) {
  try {
    return ok(
      res,
      await planService.createTemplateItem(Number(req.params.id), req.body),
      "模板项创建成功",
      201,
    );
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function updateTemplateItem(req, res) {
  try {
    return ok(
      res,
      await planService.updateTemplateItem(Number(req.params.id), Number(req.params.itemId), req.body),
      "模板项更新成功",
    );
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function deleteTemplateItem(req, res) {
  try {
    return ok(
      res,
      await planService.deleteTemplateItem(Number(req.params.id), Number(req.params.itemId)),
      "模板项删除成功",
    );
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function createAssignment(req, res) {
  try {
    return ok(res, await planService.createAssignment(req.body), "分配创建成功", 201);
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getAssignments(req, res) {
  try {
    return ok(res, await planService.listAssignments(req.query));
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}
