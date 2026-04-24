<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Calendar, Activity, Bell, ChevronRight, Clock, BarChart2, CheckCircle2 } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/services/api";

interface Elder {
  id: number;
  user_name: string;
  avatar?: string;
}

interface ElderSummary {
  todayPlan: {
    hasPlan: boolean;
    completedCount: number;
    totalCount: number;
    progress: number;
  };
  trainingSummary: {
    trainedDays: number;
    totalDuration: number;
    lastTraining: string;
  };
}

const router = useRouter();
const loading = ref(true);
const elders = ref<Elder[]>([]);
const selectedElder = ref<Elder | null>(null);
const elderSummary = ref<ElderSummary | null>(null);

async function loadElders() {
  loading.value = true;
  try {
    const response = await api.getMyElders();
    if (response.success && response.data) {
      elders.value = response.data.map((item) => {
        const elder = item.elder;
        return {
          id: elder.id,
          user_name: elder.user_name,
          avatar: elder.avatar || `https://neeko-copilot.bytedance.net/api/text2image?prompt=elderly%20chinese%20portrait&size=512x512&seed=${elder.id}`
        };
      });
      
      if (elders.value.length > 0) {
        selectedElder.value = elders.value[0];
        await loadElderSummary(elders.value[0].id);
      }
    }
  } catch (error) {
    console.error("加载老人列表失败:", error);
  } finally {
    loading.value = false;
  }
}

async function loadElderSummary(_elderId: number) {
  try {
    const response = await api.getChildTodaySummary(_elderId);
    if (response.success && response.data) {
      const data = response.data;
      const completedCount = data.completed_count || 0;
      const totalCount = data.plan_item_total || 0;
      
      elderSummary.value = {
        todayPlan: {
          hasPlan: data.hasPlan || false,
          completedCount,
          totalCount,
          progress: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
        },
        trainingSummary: {
          trainedDays: 0,
          totalDuration: Math.round((data.total_duration_seconds || 0) / 60),
          lastTraining: data.last_training_time ? new Date(data.last_training_time).toLocaleString('zh-CN') : "暂无"
        }
      };
    }
  } catch (error) {
    console.error("加载老人摘要失败:", error);
    // 即使失败也设置默认值，避免页面显示错误
    elderSummary.value = {
      todayPlan: {
        hasPlan: false,
        completedCount: 0,
        totalCount: 0,
        progress: 0
      },
      trainingSummary: {
        trainedDays: 0,
        totalDuration: 0,
        lastTraining: "暂无"
      }
    };
  }
}

function selectElder(elder: Elder) {
  selectedElder.value = elder;
  loadElderSummary(elder.id);
}

function goToTrainingRecords(elderId: number) {
  router.push(`/child/elder/${elderId}/training-records`);
}

function goToTodayPlan(elderId: number) {
  router.push(`/child/elder/${elderId}/today-plan`);
}

function goToMessages() {
  router.push("/child/messages");
}

onMounted(() => {
  loadElders();
});
</script>

<template>
  <main class="mx-auto w-[calc(100%-24px)] max-w-7xl py-6 sm:w-[calc(100%-48px)] sm:py-12">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-semibold tracking-tight">子女端</h1>
      <Button @click="goToMessages" class="gap-2">
        <Bell class="h-4 w-4" />
        消息中心
      </Button>
    </div>

    <!-- 老人选择 -->
    <div class="mb-6">
      <h2 class="mb-4 text-lg font-medium">选择老人</h2>
      <div class="flex flex-wrap gap-4">
        <div 
          v-for="elder in elders" 
          :key="elder.id"
          class="flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-all"
          :class="selectedElder?.id === elder.id ? 'border-primary bg-primary/5' : 'hover:border-primary/50'"
          @click="selectElder(elder)"
        >
          <div class="h-16 w-16 rounded-full overflow-hidden border-2 border-primary">
            <img :src="elder.avatar" :alt="elder.user_name" class="h-full w-full object-cover" />
          </div>
          <span class="font-medium">{{ elder.user_name }}</span>
        </div>
      </div>
    </div>

    <!-- 老人训练摘要 -->
    <div v-if="selectedElder && elderSummary" class="grid gap-6 lg:grid-cols-2">
      <!-- 今日计划 -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Calendar class="h-5 w-5" />
            {{ selectedElder.user_name }}的今日计划
          </CardTitle>
          <CardDescription>查看今日训练计划和完成情况</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="mb-4">
            <div class="flex justify-between mb-2">
              <span class="text-sm font-medium">完成进度</span>
              <span class="text-sm font-medium">{{ elderSummary.todayPlan.completedCount }}/{{ elderSummary.todayPlan.totalCount }}</span>
            </div>
            <div class="h-2 w-full rounded-full bg-muted">
              <div 
                class="h-2 rounded-full bg-primary transition-all" 
                :style="{ width: elderSummary.todayPlan.progress + '%' }"
              ></div>
            </div>
          </div>
          <Button @click="goToTodayPlan(selectedElder.id)" class="w-full gap-2">
            查看详情
            <ChevronRight class="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <!-- 训练记录摘要 -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Activity class="h-5 w-5" />
            {{ selectedElder.user_name }}的训练记录
          </CardTitle>
          <CardDescription>最近训练情况和趋势</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <CheckCircle2 class="h-5 w-5 text-primary" />
              <span>已训练 {{ elderSummary.trainingSummary.trainedDays }} 天</span>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Clock class="h-5 w-5 text-primary" />
              <span>总训练时长 {{ elderSummary.trainingSummary.totalDuration }} 分钟</span>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <BarChart2 class="h-5 w-5 text-primary" />
              <span>最后训练: {{ elderSummary.trainingSummary.lastTraining }}</span>
            </div>
          </div>
          <Button @click="goToTrainingRecords(selectedElder.id)" class="w-full gap-2">
            查看详情
            <ChevronRight class="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  </main>
</template>