import { createRouter, createWebHashHistory } from "vue-router";
import Home from "@/views/Home.vue";
import TrainingCategory from "@/views/TrainingCategory.vue";
import TrainingDetail from "@/views/TrainingDetail.vue";
import TodayPlan from "@/views/TodayPlan.vue";
import TrainingRecord from "@/views/TrainingRecord.vue";
import Login from "@/views/Login.vue";
import Profile from "@/views/Profile.vue";
import AdminUsers from "@/views/AdminUsers.vue";
import AdminBindings from "@/views/AdminBindings.vue";
import AdminVideos from "@/views/AdminVideos.vue";
import { api } from "@/services/api";
import AIChat from "@/views/AIChat.vue";
import ChildHome from "@/views/ChildHome.vue";
import ChildMessages from "@/views/ChildMessages.vue";
import ChildTrainingRecords from "@/views/ChildTrainingRecords.vue";
import ChildTodayPlan from "@/views/ChildTodayPlan.vue";
import ElderMessages from "@/views/ElderMessages.vue";

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: Home,
    },
    {
      path: "/login",
      name: "login",
      component: Login,
    },
    {
      path: "/profile",
      name: "profile",
      component: Profile,
      meta: { requiresAuth: true },
    },
    {
      path: "/training-category",
      name: "training-category",
      component: TrainingCategory,
    },
    {
      path: "/training/:id",
      name: "training-detail",
      component: TrainingDetail,
    },
    {
      path: "/today-plan",
      name: "today-plan",
      component: TodayPlan,
    },
    {
      path: "/training-record",
      name: "training-record",
      component: TrainingRecord,
    },
    // 管理员路由
    {
      path: "/admin/users",
      name: "admin-users",
      component: AdminUsers,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: "/admin/bindings",
      name: "admin-bindings",
      component: AdminBindings,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: "/admin/videos",
      name: "admin-videos",
      component: AdminVideos,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: "/ai-chat",
      name: "AIChat",
      component: AIChat,
      meta: { requiresAuth: true }
    },
    {
      path: "/elder/messages",
      name: "elder-messages",
      component: ElderMessages,
      meta: { requiresAuth: true }
    },
    // 子女端路由
    {
      path: "/child",
      name: "child-home",
      component: ChildHome,
      meta: { requiresAuth: true }
    },
    {
      path: "/child/messages",
      name: "child-messages",
      component: ChildMessages,
      meta: { requiresAuth: true }
    },
    {
      path: "/child/elder/:elderId/training-records",
      name: "child-training-records",
      component: ChildTrainingRecords,
      meta: { requiresAuth: true }
    },
    {
      path: "/child/elder/:elderId/today-plan",
      name: "child-today-plan",
      component: ChildTodayPlan,
      meta: { requiresAuth: true }
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const requiresAuth = to.meta.requiresAuth;
  const requiresAdmin = to.meta.requiresAdmin;
  const isLoggedIn = !!api.getToken();
  
  // 获取用户信息
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user && user.role === 'admin';

  if (requiresAuth && !isLoggedIn) {
    next("/login");
  } else if (requiresAdmin && !isAdmin) {
    next("/");
  } else {
    next();
  }
});

export default router;
