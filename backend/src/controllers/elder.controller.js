import * as authService from "../services/auth.service.js";
import * as elderService from "../services/elder.service.js";
import * as notificationService from "../services/notification.service.js";
import * as planService from "../services/plan.service.js";
import * as recordService from "../services/record.service.js";
import { fail, ok } from "../utils/response.js";

export async function getElderProfile(req, res) {
  try {
    return ok(res, await authService.getProfile(req.user.userId));
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getElderHome(req, res) {
  try {
    return ok(res, await elderService.getElderHome(req.user.userId));
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getNotifications(req, res) {
  try {
    return ok(
      res,
      await notificationService.listElderNotifications(req.user.userId, req.query.unreadOnly),
    );
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function markNotificationRead(req, res) {
  try {
    return ok(
      res,
      await notificationService.markNotificationRead(req.user.userId, Number(req.params.id)),
      "提醒已读成功",
    );
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getTodayPlan(req, res) {
  try {
    return ok(res, await planService.getTodayPlanDetail(req.user.userId));
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function generateTodayPlan(req, res) {
  try {
    return ok(res, await planService.generateTodayPlan(req.user.userId), "今日计划生成成功");
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function activateTodayTemplate(req, res) {
  try {
    return ok(res, await planService.activateTodayTemplate(req.user.userId), "今日模板训练已开启");
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function completeTodayPlanItem(req, res) {
  try {
    return ok(
      res,
      await planService.completeTodayPlanItem(req.user.userId, Number(req.params.id)),
      "计划项已完成",
    );
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function skipTodayPlanItem(req, res) {
  try {
    return ok(
      res,
      await planService.skipTodayPlanItem(req.user.userId, Number(req.params.id)),
      "计划项已跳过",
    );
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getTrainingRecords(req, res) {
  try {
    return ok(res, await recordService.listElderTrainingRecords(req.user.userId, req.query.days));
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getTrainingRecordDetail(req, res) {
  try {
    return ok(res, await recordService.getElderTrainingRecordDetail(req.user.userId, Number(req.params.id)));
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getTrainingTrend(req, res) {
  try {
    return ok(res, await recordService.getElderTrainingTrend(req.user.userId, req.query.days));
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function startTrainingRecord(req, res) {
  try {
    return ok(res, await recordService.startTrainingRecord(req.user.userId, req.body), "训练开始成功", 201);
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function finishTrainingRecord(req, res) {
  try {
    return ok(
      res,
      await recordService.finishTrainingRecord(req.user.userId, Number(req.params.id), req.body),
      "训练完成成功",
    );
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}
