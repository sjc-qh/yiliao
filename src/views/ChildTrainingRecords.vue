<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { Activity, Clock, CheckCircle2, ArrowLeft } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api";

interface ElderInfo {
  id: number;
  user_name: string;
  avatar?: string;
}

interface TrainingRecord {
  id: number;
  videoTitle: string;
  duration: number;
  completed: boolean;
  date: string;
  time: string;
}

const router = useRouter();
const route = useRoute();
const loading = ref(true);
const elderId = ref(Number(route.params.elderId));
const elderInfo = ref<ElderInfo | null>(null);
const trainingRecords = ref<TrainingRecord[]>([]);

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

async function loadTrainingRecords() {
  loading.value = true;
  try {
    const response = await api.getChildTrainingRecords(elderId.value, 30);
    if (response.success && response.data) {
      trainingRecords.value = response.data.map((record: any) => {
        const startTime = record.startTime ? new Date(record.startTime) : new Date();
        return {
          id: record.id,
          videoTitle: record.videoTitle || "未知训练",
          duration: Math.round((record.actualDurationSeconds || 0) / 60),
          completed: record.completed === 1 || record.completed === true,
          date: startTime.toLocaleDateString('zh-CN'),
          time: startTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        };
      });
    }
  } catch (error) {
    console.error("加载训练记录失败:", error);
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.push("/child");
}

function goToTodayPlan() {
  router.push(`/child/elder/${elderId.value}/today-plan`);
}

onMounted(() => {
  loadElderInfo();
  loadTrainingRecords();
});
</script>

<template>
  <main class="mx-auto w-[calc(100%-24px)] max-w-7xl py-6 sm:w-[calc(100%-48px)] sm:py-12">
    <div class="mb-6 flex items-center gap-4">
      <Button variant="ghost" size="icon" @click="goBack">
        <ArrowLeft class="h-5 w-5" />
      </Button>
      <h1 class="text-2xl font-semibold tracking-tight">{{ elderInfo?.user_name }}的训练记录</h1>
    </div>

    <!-- 训练统计 -->
    <div class="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
      <Card>
        <CardContent class="flex items-center justify-between p-6">
          <div>
            <CardTitle class="text-sm font-medium text-muted-foreground">总训练次数</CardTitle>
            <p class="text-2xl font-semibold">{{ trainingRecords.length }}</p>
          </div>
          <div class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Activity class="h-6 w-6 text-primary" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="flex items-center justify-between p-6">
          <div>
            <CardTitle class="text-sm font-medium text-muted-foreground">总训练时长</CardTitle>
            <p class="text-2xl font-semibold">{{ trainingRecords.reduce((sum, record) => sum + record.duration, 0) }} 分钟</p>
          </div>
          <div class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock class="h-6 w-6 text-primary" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="flex items-center justify-between p-6">
          <div>
            <CardTitle class="text-sm font-medium text-muted-foreground">完成率</CardTitle>
            <p class="text-2xl font-semibold">100%</p>
          </div>
          <div class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 class="h-6 w-6 text-primary" />
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- 训练记录列表 -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Activity class="h-5 w-5" />
          训练记录
        </CardTitle>
        <CardDescription>查看详细的训练记录</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="trainingRecords.length === 0" class="text-center py-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-4 text-muted-foreground"><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
          <p class="text-muted-foreground">暂无训练记录</p>
        </div>
        <div v-else class="space-y-4">
          <div 
            v-for="record in trainingRecords" 
            :key="record.id"
            class="flex items-center justify-between p-4 rounded-lg border hover:border-primary/50 transition-all"
          >
            <div class="flex items-center gap-4">
              <div class="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity class="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 class="font-medium">{{ record.videoTitle }}</h3>
                <div class="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock class="h-4 w-4" />
                  {{ record.duration }} 分钟
                  <span class="mx-2">•</span>
                  {{ record.date }} {{ record.time }}
                </div>
              </div>
            </div>
            <Badge variant="secondary" class="bg-green-100 text-green-800 hover:bg-green-100">
              已完成
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>

    <div class="mt-6 flex gap-4">
      <Button @click="goBack" class="flex-1">返回子女端首页</Button>
      <Button @click="goToTodayPlan" class="flex-1">查看今日计划</Button>
    </div>
  </main>
</template>