import * as trainingService from "../services/training.service.js";
import { fail, ok } from "../utils/response.js";

export async function getCategories(_req, res) {
  try {
    const result = await trainingService.getCategories();
    return ok(res, result);
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getVideos(req, res) {
  try {
    const result = await trainingService.getVideos(req.query);
    return ok(res, result);
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getVideoDetail(req, res) {
  try {
    const result = await trainingService.getVideoDetail(Number(req.params.id));
    return ok(res, result);
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getTodayPlan(req, res) {
  try {
    const result = await trainingService.getTodayPlan(req.user.userId);
    return ok(res, result);
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function getTrainingRecords(req, res) {
  try {
    const result = await trainingService.getTrainingRecords(req.user.userId, req.query);
    return ok(res, result);
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}

export async function createTrainingRecord(req, res) {
  try {
    const result = await trainingService.createTrainingRecord(req.user.userId, req.body);
    return ok(res, result, "训练记录创建成功", 201);
  } catch (error) {
    return fail(res, error.status || 500, error.message || "服务器内部错误");
  }
}
