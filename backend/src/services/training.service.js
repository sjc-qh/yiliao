import {
  getPublicCategories,
  getPublicVideoById,
  getPublicVideos,
} from "./content.service.js";
import { getTodayPlanSummary } from "./plan.service.js";
import {
  createTrainingRecord as createTrainingRecordEntry,
  listElderTrainingRecords,
} from "./record.service.js";

export async function getCategories() {
  return getPublicCategories();
}

export async function getVideos(query) {
  return getPublicVideos(query);
}

export async function getVideoDetail(videoId) {
  return getPublicVideoById(videoId);
}

export async function getTodayPlan(userId) {
  return getTodayPlanSummary(userId);
}

export async function getTrainingRecords(userId, query) {
  return listElderTrainingRecords(userId, query.days);
}

export async function createTrainingRecord(userId, payload) {
  return createTrainingRecordEntry(userId, payload);
}
