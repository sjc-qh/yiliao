<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeft, CheckCircle, Circle, Clock, Play, GripVertical } from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/services/api";

const router = useRouter();
const loading = ref(true);
const isLoggedIn = ref(!!api.getToken());

const todayPlan = ref({
  date: new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" }),
  totalDuration: "33分钟",
  completedCount: 0,
  totalCount: 3,
  progress: 0,
});

type TrainingItem = {
  id: string;
  title: string;
  duration: string;
  order: number;
  completed: boolean;
  current: boolean;
};
const trainingList = ref<TrainingItem[]>([
  {
    id: "1",
    title: "按身体部位",
    duration: "10分钟",
    order: 1,
    completed: false,
    current: false,
  },
  {
    id: "2",
    title: "按损伤/疾病类型",
    duration: "15分钟",
    order: 2,
    completed: false,
    current: false,
  },
  {
    id: "3",
    title: "常用康复手段",
    duration: "8分钟",
    order: 3,
    completed: false,
    current: false,
  },
]);

const draggedItem = ref<TrainingItem | null>(null);
const dragOverItem = ref<TrainingItem | null>(null);

async function loadTodayPlan() {
  const isLoggedIn = !!api.getToken();
  if (!isLoggedIn) {
    loading.value = false;
    return;
  }

  loading.value = true;
  try {
    const response = await api.getTodayPlan();
    if (response.success && response.data) {
      todayPlan.value = response.data;
      if (response.data.trainingList && response.data.trainingList.length > 0) {
        trainingList.value = response.data.trainingList;
      }
    }
  } catch (error) {
    console.error("加载今日计划失败:", error);
  } finally {
    loading.value = false;
  }
}

function handleDragStart(event: DragEvent, item: TrainingItem) {
  draggedItem.value = item;
  event.dataTransfer!.effectAllowed = "move";
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  event.dataTransfer!.dropEffect = "move";
}

function handleDragEnter(event: DragEvent, item: TrainingItem) {
  event.preventDefault();
  dragOverItem.value = item;
}

function handleDragLeave() {
  dragOverItem.value = null;
}

function handleDrop(event: DragEvent, targetItem: TrainingItem) {
  event.preventDefault();

  if (draggedItem.value && draggedItem.value !== targetItem) {
    const draggedId = draggedItem.value.id;
    const draggedIndex = trainingList.value.findIndex((item) => item.id === draggedId);
    const targetIndex = trainingList.value.findIndex((item) => item.id === targetItem.id);

    const [removed] = trainingList.value.splice(draggedIndex, 1);
    trainingList.value.splice(targetIndex, 0, removed);

    trainingList.value.forEach((item, index) => {
      item.order = index + 1;
    });
  }

  draggedItem.value = null;
  dragOverItem.value = null;
}

onMounted(() => {
  loadTodayPlan();
});

function goBack() {
  router.back();
}

function goToTraining(id: string) {
  const training = trainingList.value.find((t) => t.id === id);
  if (training) {
    router.push(`/training-category`);
  }
}

function startNextTraining() {
  const sortedTrainings = [...trainingList.value].sort((a, b) => a.order - b.order);
  const next = sortedTrainings.find((t) => !t.completed);
  if (next) {
    router.push(`/training-category`);
  }
}
</script>

<template>
  <main class="mx-auto w-[calc(100%-24px)] max-w-7xl py-6 sm:w-[calc(100%-48px)] sm:py-12">
    <div class="mb-6 flex items-center gap-4">
      <Button variant="ghost" size="icon" @click="goBack">
        <ArrowLeft class="h-5 w-5" />
      </Button>
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">今日计划</h1>
        <p class="text-sm text-muted-foreground">{{ todayPlan.date }}</p>
      </div>
    </div>

    <div v-if="!isLoggedIn">
      <Card class="border-primary/50 bg-primary/5">
        <CardContent class="flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div class="text-lg font-medium">请登录以查看个人训练计划</div>
          <p class="text-sm text-muted-foreground">登录后可以查看个性化的训练计划和记录</p>
          <Button @click="router.push('/login')"> 立即登录 </Button>
        </CardContent>
      </Card>
    </div>

    <div v-else>
      <Card class="mb-6">
        <CardHeader class="pb-2">
          <div class="flex items-center justify-between">
            <CardTitle>今日训练进度</CardTitle>
            <Badge variant="outline">
              {{ todayPlan.completedCount }}/{{ todayPlan.totalCount }} 完成
            </Badge>
          </div>
        </CardHeader>
        <CardContent class="grid gap-4">
          <Progress :value="todayPlan.progress" />
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">总时长: {{ todayPlan.totalDuration }}</span>
            <span class="font-medium">{{ todayPlan.progress }}%</span>
          </div>
        </CardContent>
      </Card>

      <section>
        <div class="mb-4">
          <h2 class="text-xl font-semibold tracking-tight">训练顺序</h2>
          <p class="text-sm text-muted-foreground">
            按顺序完成训练效果更佳，您可以拖动设置适合自己的顺序
          </p>
        </div>
        <div class="grid gap-3">
          <Card
            v-for="training in trainingList"
            :key="training.id"
            class="cursor-pointer transition-colors hover:bg-accent"
            :class="{
              'border-primary': training.current,
              'border-dashed': dragOverItem?.id === training.id,
            }"
            draggable="true"
            @dragstart="handleDragStart($event, training)"
            @dragover="handleDragOver"
            @dragenter="handleDragEnter($event, training)"
            @dragleave="handleDragLeave"
            @drop="handleDrop($event, training)"
            @click="goToTraining(training.id)"
          >
            <CardContent class="flex items-center justify-between p-4">
              <div class="flex items-center gap-4">
                <button
                  class="flex h-10 w-10 cursor-move items-center justify-center rounded-full"
                  @click.stop
                >
                  <GripVertical class="h-5 w-5 text-muted-foreground" />
                </button>
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-full"
                  :class="
                    training.completed
                      ? 'bg-primary/10'
                      : training.current
                        ? 'bg-primary/20'
                        : 'bg-muted'
                  "
                >
                  <CheckCircle v-if="training.completed" class="h-5 w-5 text-primary" />
                  <Circle v-else-if="training.current" class="h-5 w-5 text-primary" />
                  <span v-else class="text-sm font-medium">{{ training.order }}</span>
                </div>
                <div class="grid gap-0.5">
                  <p
                    class="font-medium"
                    :class="training.completed ? 'text-muted-foreground line-through' : ''"
                  >
                    {{ training.title }}
                  </p>
                  <p class="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock class="h-3 w-3" />
                    {{ training.duration }}
                    <Badge v-if="training.current" variant="default" class="ml-2"> 进行中 </Badge>
                    <Badge v-else-if="training.completed" variant="default" class="ml-2">
                      已完成
                    </Badge>
                  </p>
                </div>
              </div>
              <Button v-if="!training.completed" size="sm" @click.stop="goToTraining(training.id)">
                <Play class="mr-1 h-4 w-4" />
                {{ training.current ? "继续" : "开始" }}
              </Button>
              <CheckCircle v-else class="h-5 w-5 text-primary" />
            </CardContent>
          </Card>
        </div>
      </section>

      <div v-if="!trainingList.every((t) => t.completed)" class="mt-6">
        <Button class="w-full" size="lg" @click="startNextTraining">
          <Play class="mr-2 h-5 w-5" />
          {{ trainingList.find((t) => t.current) ? "继续当前训练" : "开始下一个训练" }}
        </Button>
      </div>

      <div v-else class="mt-6">
        <Card class="border-primary/50 bg-primary/5">
          <CardContent class="flex items-center justify-center gap-2 p-6 text-center">
            <CheckCircle class="h-6 w-6 text-primary" />
            <div>
              <p class="font-medium">恭喜!今日训练已全部完成</p>
              <p class="text-sm text-muted-foreground">继续保持,明天见</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </main>
</template>