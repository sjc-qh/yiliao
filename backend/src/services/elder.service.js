import { getTodayPlanSummary } from "./plan.service.js";
import { countUnreadNotifications } from "./notification.service.js";
import { getRecentTrainingRecords } from "./record.service.js";

export async function getElderHome(elderId) {
  const [todayPlan, unreadNotificationCount, recentRecords] = await Promise.all([
    getTodayPlanSummary(elderId),
    countUnreadNotifications(elderId),
    getRecentTrainingRecords(elderId, 3),
  ]);

  return {
    todayPlan,
    unreadNotificationCount,
    recentRecords,
  };
}
