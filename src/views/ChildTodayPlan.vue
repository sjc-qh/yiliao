<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { Calendar, CheckCircle2, XCircle, Clock, ArrowLeft } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api";

interface ElderInfo {
  id: number;
  user_name: string;
  avatar?: string;
}

interface PlanItem {
  id: number;
  videoTitle: string;
  duration: string;
  status: string;
  order: number;
}

interface TodayPlan {
  hasPlan: boolean;
  planItems: PlanItem[];
  completedCount: number;
  totalCount: number;
  progress: number;
}

const router = useRouter();
const route = useRoute();
const loading = ref(true);
const elderId = ref(Number(route.params.elderId));
const elderInfo = ref<ElderInfo | null>(null);
const todayPlan = ref<TodayPlan | null>(null);

async function loadElderInfo() {
  try {
    const response = await api.getMyElders();
    if (response.success && response.data) {
      const item = response.data.find((i) => i.elder.id === elderId.value);
      if (item) {
        const elder = item.elder;
        elderInfo.value = {
          id: elder.id,
          user_name: elder.user_name,
          avatar: elder.avatar || `https://neeko-copilot.bytedance.net/api/text2image?prompt=elderly%20chinese%20portrait&size=512x512&seed=${elder.id}`
        };
      }
    }
  } catch (error) {
    console.error("加载老人信息失败:", error);
  }
}

async function loadTodayPlan() {
  loading.value = true;
  try {
    const response = await api.getChildTodaySummary(elderId.value);
    if (response.success && response.data) {
      const data = response.data;
      const completedCount = data.completed_count || 0;
      const totalCount = data.plan_item_total || 0;
      
      todayPlan.value = {
        hasPlan: data.hasPlan || false,
        planItems: [],
        completedCount,
        totalCount,
        progress: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
      };
    }
  } catch (error) {
    console.error("加载今日计划失败:", error);
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.push("/child");
}

function goToTrainingRecords() {
  router.push(`/child/elder/${elderId.value}/training-records`);
}

onMounted(() => {
  loadElderInfo();
  loadTodayPlan();
});
</script>

<template>
  <main class="mx-auto w-[calc(100%-24px)] max-w-7xl py-6 sm:w-[calc(100%-48px)] sm:py-12">
    <div class="mb-6 flex items-center gap-4">
      <Button variant="ghost" size="icon" @click="goBack">
        <ArrowLeft class="h-5 w-5" />
      </Button>
      <h1 class="text-2xl font-semibold tracking-tight">{{ elderInfo?.user_name }}的今日计划</h1>
    </div>

    <!-- 计划进度 -->
    <Card class="mb-6">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Calendar class="h-5 w-5" />
          今日计划进度
        </CardTitle>
        <CardDescription>{{ new Date().toLocaleDateString('zh-CN') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="mb-4">
          <div class="flex justify-between mb-2">
            <span class="text-sm font-medium">完成进度</span>
            <span class="text-sm font-medium">{{ todayPlan?.completedCount }}/{{ todayPlan?.totalCount }}</span>
          </div>
          <div class="h-2 w-full rounded-full bg-muted">
            <div 
              class="h-2 rounded-full bg-primary transition-all" 
              :style="{ width: (todayPlan?.progress || 0) + '%' }"
            ></div>
          </div>
        </div>
        <div class="flex items-center justify-between text-sm text-muted-foreground">
          <div class="flex items-center gap-2">
            <CheckCircle2 class="h-4 w-4 text-green-500" />
            <span>已完成 {{ todayPlan?.completedCount }} 项</span>
          </div>
          <div class="flex items-center gap-2">
            <XCircle class="h-4 w-4 text-gray-400" />
            <span>待完成 {{ (todayPlan?.totalCount || 0) - (todayPlan?.completedCount || 0) }} 项</span>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 计划详情 -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Calendar class="h-5 w-5" />
          今日训练计划
        </CardTitle>
        <CardDescription>查看详细的训练计划</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="!todayPlan?.hasPlan" class="text-center py-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-4 text-muted-foreground"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          <p class="text-muted-foreground">今日暂无训练计划</p>
        </div>
        <div v-else class="space-y-4">
          <div 
            v-for="item in todayPlan.planItems" 
            :key="item.id"
            class="flex items-center justify-between p-4 rounded-lg border transition-all"
            :class="item.status === 'completed' ? 'border-green-200 bg-green-50' : 'hover:border-primary/50'"
          >
            <div class="flex items-center gap-4">
              <div class="h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium"
                   :class="item.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-muted'">
                {{ item.order }}
              </div>
              <div>
                <h3 class="font-medium" :class="item.status === 'completed' ? 'text-green-800 line-through' : ''">
                  {{ item.videoTitle }}
                </h3>
                <div class="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock class="h-4 w-4" />
                  {{ item.duration }}
                </div>
              </div>
            </div>
            <Badge 
              variant="secondary" 
              :class="item.status === 'completed' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-gray-100 text-gray-800 hover:bg-gray-100'"
            >
              {{ item.status === 'completed' ? '已完成' : '待完成' }}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>

    <div class="mt-6 flex gap-4">
      <Button @click="goBack" class="flex-1">返回子女端首页</Button>
      <Button @click="goToTrainingRecords" class="flex-1">查看训练记录</Button>
    </div>
  </main>
</template>