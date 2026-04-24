<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from "vue-router";
import { Activity, Calendar, Home, ListVideo, Moon, Sun, User, Users, Link, Film, Brain, Bell } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useColorMode } from "@vueuse/core";
import { ref, computed, watch } from "vue";

const router = useRouter();
const mode = useColorMode();

// 使用ref保存用户信息，确保响应式
const currentUser = ref<any>(null);

// 加载用户信息
const loadUser = () => {
  const userStr = localStorage.getItem('user');
  currentUser.value = userStr ? JSON.parse(userStr) : null;
};

// 页面加载时加载用户信息
loadUser();

// 监听路由变化，确保用户信息更新
watch(() => router.currentRoute.value.path, () => {
  loadUser();
});

// 根据用户角色动态生成导航菜单
const navItems = computed(() => {
  const userRole = currentUser.value?.role;
  const isAdmin = userRole === 'admin';
  const isChild = userRole === 'child';
  const isElder = userRole === 'elder';
  
  if (isChild) {
    // 子女端菜单
    return [
      { name: "子女端首页", path: "/child", icon: Home },
      { name: "消息中心", path: "/child/messages", icon: Bell },
      { name: "个人中心", path: "/profile", icon: User },
    ];
  } else if (isElder) {
    // 老人端菜单
    return [
      { name: "首页", path: "/", icon: Home },
      { name: "消息中心", path: "/elder/messages", icon: Bell },
      { name: "AI助手", path: "/ai-chat", icon: Brain }, 
      { name: "训练分类", path: "/training-category", icon: ListVideo },
      { name: "今日计划", path: "/today-plan", icon: Calendar },
      { name: "训练记录", path: "/training-record", icon: Activity },
      { name: "个人中心", path: "/profile", icon: User },
    ];
  } else if (isAdmin) {
    // 管理员菜单
    return [
      { name: "首页", path: "/", icon: Home },
      { name: "AI助手", path: "/ai-chat", icon: Brain }, 
      { name: "训练分类", path: "/training-category", icon: ListVideo },
      { name: "今日计划", path: "/today-plan", icon: Calendar },
      { name: "训练记录", path: "/training-record", icon: Activity },
      { name: "个人中心", path: "/profile", icon: User },
      { name: "用户管理", path: "/admin/users", icon: Users },
      { name: "绑定管理", path: "/admin/bindings", icon: Link },
      { name: "视频管理", path: "/admin/videos", icon: Film }
    ];
  } else {
    // 未登录或其他角色
    return [
      { name: "首页", path: "/", icon: Home },
      { name: "训练分类", path: "/training-category", icon: ListVideo },
      { name: "登录", path: "/login", icon: User },
    ];
  }
});

function goToHome() {
  router.push("/");
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <header
      class="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
    >
      <div class="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
        <div class="flex items-center gap-2">
          <Activity class="h-6 w-6 text-primary" />
          <span class="cursor-pointer font-semibold" @click="goToHome">康复训练</span>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="outline">
                <Sun class="size-5 dark:hidden" />
                <Moon class="hidden size-5 dark:block" />
                <span class="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuItem @click="mode = 'light'"> 亮色 </DropdownMenuItem>
              <DropdownMenuItem @click="mode = 'dark'"> 暗色 </DropdownMenuItem>
              <DropdownMenuItem @click="mode = 'auto'"> 系统 </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <nav class="flex items-center gap-1">
          <Button v-for="item in navItems" :key="item.path" variant="default" size="sm" as-child>
            <RouterLink :to="item.path" class="flex items-center gap-2">
              <component :is="item.icon" class="h-4 w-4" />
              <span class="hidden sm:inline">{{ item.name }}</span>
            </RouterLink>
          </Button>
        </nav>
      </div>
    </header>

    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
