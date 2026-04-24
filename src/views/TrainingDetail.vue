<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Info,
  ListChecks,
  Pause,
  Play,
  Speaker,
  AlertTriangle,
} from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/services/api";
import { trainingStepsConfig } from "@/config/trainingSteps";

const route = useRoute();
const router = useRouter();
const loading = ref(true);

// B站播放器地址
const biliPlayerUrl = ref("");

const training = ref({
  id: route.params.id,
  title: "肩颈活动训练",
  category: "关节舒缓",
  duration: "10分钟",
  difficulty: "入门",
  description: "通过轻柔的颈部旋转和肩部活动,缓解肩颈僵硬和不适。适合长期伏案工作的人群。",
  steps: [
    { name: "颈部左右旋转", duration: "30秒", completed: false },
    { name: "颈部前后倾斜", duration: "30秒", completed: false },
    { name: "肩部上下活动", duration: "1分钟", completed: false },
    { name: "肩部前后旋转", duration: "1分钟", completed: false },
    { name: "头部侧倾拉伸", duration: "每侧30秒", completed: false },
    { name: "全身放松", duration: "30秒", completed: false },
  ] as { name: string; duration?: string; completed: boolean }[],
  precautions: [
    "训练时保持呼吸平稳,不要憋气",
    "动作应轻柔缓慢,不要勉强",
    "如感到疼痛应立即停止",
    "饭后30分钟内不宜训练",
  ],
  progress: 0,
  isPlaying: false,
});

const startTime = ref<Date | null>(null);
const endTime = ref<Date | null>(null);
const elapsedTime = ref(0);
let timerInterval: number | null = null;

async function loadTrainingDetail() {
  loading.value = true;
  try {
    const videoId = Number.parseInt(route.params.id as string);
    const response = await api.getVideoDetail(videoId);
    if (response.success && response.data) {
      const data = response.data;
      const videoConfig = trainingStepsConfig[videoId];
      
      training.value = {
        ...training.value,
        title: data.title,
        duration: data.duration,
        description: data.description || training.value.description,
        category: data.categories && data.categories.length > 0 ? data.categories[0].name : training.value.category,
        steps: videoConfig?.steps || training.value.steps,
        precautions: videoConfig?.precautions || training.value.precautions,
      };
      
      // 从B站链接中提取BV号，构造播放器地址
      if (data.video_url && data.video_url.includes('BV')) {
        const bvidMatch = data.video_url.match(/BV[a-zA-Z0-9]+/);
        if (bvidMatch) {
          biliPlayerUrl.value = `//player.bilibili.com/player.html?bvid=${bvidMatch[0]}&autoplay=0`;
        }
      }
    }
  } catch (error) {
    console.error("加载训练详情失败:", error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadTrainingDetail();
});

function goBack() {
  router.back();
}

function togglePlay() {
  // 注意：B站 iframe 无法通过 JavaScript 控制播放/暂停
  // 这个按钮现在只控制计时功能
  training.value.isPlaying = !training.value.isPlaying;

  if (training.value.isPlaying) {
    startTime.value = new Date();
    startTimer();
  } else {
    endTime.value = new Date();
    stopTimer();
  }
}

function startTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  timerInterval = window.setInterval(() => {
    if (startTime.value) {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startTime.value.getTime()) / 1000);
      elapsedTime.value = diff;
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

async function completeTraining() {
  const isLoggedIn = !!api.getToken();
  if (!isLoggedIn) {
    router.push("/login");
    return;
  }

  stopTimer();
  endTime.value = new Date();

  let actualDurationSeconds = elapsedTime.value;

  if (startTime.value && endTime.value) {
    actualDurationSeconds = Math.floor(
      (endTime.value.getTime() - startTime.value.getTime()) / 1000,
    );
  }

  if (actualDurationSeconds < 1) {
    actualDurationSeconds = 1;
  }

  try {
    const response = await api.createTrainingRecord({
      video_id: Number.parseInt(route.params.id as string),
      start_time: startTime.value ? startTime.value.toISOString() : new Date().toISOString(),
      end_time: endTime.value ? endTime.value.toISOString() : new Date().toISOString(),
      actual_duration_seconds: actualDurationSeconds,
      completed: true,
      source: "free_training",
    });

    if (response.success) {
      router.push("/today-plan");
    } else {
      console.error("创建训练记录失败:", response.error);
      router.push("/today-plan");
    }
  } catch (error) {
    console.error("创建训练记录失败:", error);
    router.push("/today-plan");
  }
}
</script>

<template>
  <main class="mx-auto w-[calc(100%-24px)] max-w-7xl py-6 sm:w-[calc(100%-48px)] sm:py-12">
    <div class="mb-6 flex items-center gap-4">
      <Button variant="ghost" size="icon" @click="goBack">
        <ArrowLeft class="h-5 w-5" />
      </Button>
      <h1 class="text-2xl font-semibold tracking-tight">{{ training.title }}</h1>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <section>
        <Card class="mb-6">
          <CardContent class="p-0">
            <iframe
            :src="biliPlayerUrl"
            class="aspect-video w-full"
            frameborder="0"
            allowfullscreen
          ></iframe>/////
            <div class="flex items-center justify-between p-4">
              <Button @click="togglePlay">
                <Play v-if="!training.isPlaying" class="mr-2 h-4 w-4" />
                <Pause v-else class="mr-2 h-4 w-4" />
                {{ training.isPlaying ? "暂停" : "开始训练" }}
              </Button>
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2">
                  <Clock class="h-4 w-4 text-muted-foreground" />
                  <span class="text-sm font-medium">
                    {{ Math.floor(elapsedTime / 60) }}:{{
                      String(elapsedTime % 60).padStart(2, "0")
                    }}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <Button variant="outline" size="icon">
                    <Speaker class="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <ListChecks class="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>训练说明</CardTitle>
            <CardDescription>{{ training.description }}</CardDescription>
          </CardHeader>
          <CardContent class="grid gap-4">
            <div class="flex flex-wrap gap-3">
              <Badge variant="secondary">
                <Clock class="mr-1 h-3 w-3" />
                {{ training.duration }}
              </Badge>
              <Badge variant="secondary">
                {{ training.category }}
              </Badge>
              <Badge variant="secondary">
                {{ training.difficulty }}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card class="mb-6">
          <CardHeader>
            <CardTitle>训练步骤</CardTitle>
          </CardHeader>
          <CardContent class="grid gap-3">
            <div
              v-for="(step, index) in training.steps"
              :key="index"
              class="flex items-center justify-between rounded-lg border p-3"
              :class="step.completed ? 'border-primary/20 bg-primary/5' : ''"
            >
              <div class="flex items-center gap-3">
                <div
                  class="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                  :class="step.completed ? 'bg-primary text-primary-foreground' : 'bg-muted'"
                >
                  <CheckCircle v-if="step.completed" class="h-4 w-4" />
                  <span v-else>{{ index + 1 }}</span>
                </div>
                <span :class="step.completed ? 'text-muted-foreground line-through' : ''">
                  {{ step.name }}
                </span>
              </div>
              <span class="text-sm text-muted-foreground">{{ step.duration || '' }}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <AlertTriangle class="h-5 w-5 text-amber-500" />
              注意事项
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul class="grid gap-2">
              <li
                v-for="(precaution, index) in training.precautions"
                :key="index"
                class="flex items-start gap-2 text-sm"
              >
                <Info class="mt-0.5 h-4 w-4 text-muted-foreground" />
                <span>{{ precaution }}</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>

    <div class="mt-6">
      <Button class="w-full" size="lg" @click="completeTraining">
        <CheckCircle class="mr-2 h-5 w-5" />
        完成训练
      </Button>
    </div>
  </main>
</template>
