import * as authService from "../services/auth.service.js";
import * as bindingService from "../services/binding.service.js";
import * as notificationService from "../services/notification.service.js";
import * as recordService from "../services/record.service.js";
import { fail, ok } from "../utils/response.js";

export async function getChildProfile(req, res) {
  try {
    return ok(res, await authService.getProfile(req.user.userId));
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getMyElders(req, res) {
  try {
    return ok(res, await bindingService.listChildElders(req.user.userId));
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function sendTrainingReminder(req, res) {
  try {
    return ok(
      res,
      await notificationService.sendTrainingReminder(req.user.userId, Number(req.params.elderId), req.body.content),
      "提醒发送成功",
      201,
    );
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getLatestReminder(req, res) {
  try {
    return ok(res, await notificationService.getLatestReminder(req.user.userId, Number(req.params.elderId)));
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getChildTodaySummary(req, res) {
  try {
    return ok(res, await recordService.getChildTodaySummary(req.user.userId, Number(req.params.elderId)));
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getChildTrainingRecords(req, res) {
  try {
    return ok(
      res,
      await recordService.listChildTrainingRecords(req.user.userId, Number(req.params.elderId), req.query.days),
    );
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getChildTrainingRecordDetail(req, res) {
  try {
    return ok(
      res,
      await recordService.getChildTrainingRecordDetail(
        req.user.userId,
        Number(req.params.elderId),
        Number(req.params.recordId),
      ),
    );
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getChildTrainingTrend(req, res) {
  try {
    return ok(
      res,
      await recordService.getChildTrainingTrend(req.user.userId, Number(req.params.elderId), req.query.days),
    );
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getChildWeeklySummary(req, res) {
  try {
    return ok(res, await recordService.getChildWeeklySummary(req.user.userId, Number(req.params.elderId)));
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}
