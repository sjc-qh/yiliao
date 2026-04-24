<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Activity, ArrowRight, Calendar, ChevronRight, Clock, Play } from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api } from "@/services/api";

const router = useRouter();
const loading = ref(true);

const todayTraining = ref({
  title: "按身体部位",
  duration: "10分钟",
  progress: 0,
});

const todayCategories = ref([
  { name: "按身体部位", progress: 0 },
  { name: "按损伤/疾病类型", progress: 0 },
  { name: "常用康复手段", progress: 0 },
]);

const recentRecords = ref([
  { date: "今天", title: "手臂拉伸训练", duration: "8分钟", completed: true },
  { date: "昨天", title: "腿部力量训练", duration: "15分钟", completed: true },
  { date: "3月24日", title: "关节舒缓训练", duration: "10分钟", completed: true },
]);

const categories = ref([
  { name: "手臂训练", count: 12 },
  { name: "腿脚训练", count: 15 },
  { name: "关节舒缓", count: 8 },
  { name: "坐着练", count: 6 },
  { name: "站着练", count: 10 },
  { name: "5分钟训练", count: 20 },
  { name: "10分钟训练", count: 18 },
]);

async function loadData() {
  loading.value = true;
  try {
    const categoriesRes = await api.getTrainingCategories();

    if (categoriesRes.success && categoriesRes.data) {
      categories.value = categoriesRes.data;
    }

    const isLoggedIn = !!api.getToken();
    if (isLoggedIn) {
      const [recordsRes, todayPlanRes] = await Promise.all([
        api.getTrainingRecords(7),
        api.getTodayPlan(),
      ]);

      if (recordsRes.success && recordsRes.data) {
        recentRecords.value = recordsRes.data.records.slice(0, 3).map((r) => ({
          date: r.date,
          title: r.trainings[0]?.title || "",
          duration: r.trainings[0]?.duration || "",
          completed: r.trainings[0]?.completed || false,
        }));
      }

      if (todayPlanRes.success && todayPlanRes.data) {
        const plan = todayPlanRes.data;
        if (plan.trainingList.length > 0) {
          todayTraining.value = {
            title: plan.trainingList[0].title,
            duration: plan.trainingList[0].duration,
            progress: plan.progress,
          };
        }
      }
    }
  } catch (error) {
    console.error("加载数据失败:", error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});

function startTraining() {
  router.push("/training-category");
}

function goToRecord() {
  router.push("/training-record");
}

function goToCategory() {
  router.push("/training-category");
}

function goToTodayPlan() {
  router.push("/today-plan");
}

function goToCategoryTraining(_categoryName: string) {
  router.push("/training-category");
}
</script>

<template>
  <main class="mx-auto w-[calc(100%-24px)] max-w-7xl py-6 sm:w-[calc(100%-48px)] sm:py-12">
    <section class="mb-8">
      <Card class="overflow-hidden">
        <CardHeader class="pb-0">
          <div class="grid max-w-3xl gap-4 sm:gap-5">
            <Badge variant="secondary">康复医疗</Badge>
            <CardTitle class="text-3xl leading-tight tracking-tight sm:text-5xl sm:leading-tight">
              更清晰的康复路径
              <br />
              更安心的恢复过程
            </CardTitle>
            <CardDescription class="max-w-2xl text-sm leading-7 sm:text-base">
              围绕术后恢复、慢病运动干预和居家训练支持,提供简洁明确的康复医疗介绍与演示内容。
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent class="grid gap-5">
          <div class="flex flex-wrap gap-3">
            <Button size="lg" @click="startTraining">
              一键开始训练
              <ArrowRight />
            </Button>
            <Button variant="outline" size="lg" @click="goToTodayPlan"> 今日计划 </Button>
          </div>
        </CardContent>
      </Card>
    </section>

    <section class="mb-8">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-xl font-semibold tracking-tight">今日训练</h2>
        <Button variant="ghost" size="sm" @click="goToTodayPlan">
          查看全部
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
      <div class="grid gap-3 sm:grid-cols-3">
        <Card
          v-for="category in todayCategories"
          :key="category.name"
          class="cursor-pointer transition-colors hover:bg-accent"
          @click="goToCategoryTraining(category.name)"
        >
          <CardHeader class="pb-2">
            <div class="flex items-center gap-2">
              <Activity class="h-5 w-5 text-primary" />
              <CardTitle class="text-base">{{ category.name }}</CardTitle>
            </div>
          </CardHeader>
          <CardContent class="grid gap-3">
            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-foreground">训练进度</span>
                <span class="font-medium">{{ category.progress }}%</span>
              </div>
              <div class="h-2 w-full rounded-full bg-secondary">
                <div
                  class="h-2 rounded-full bg-primary transition-all"
                  :style="{ width: `${category.progress}%` }"
                />
              </div>
            </div>
            <Button class="w-full" size="sm">
              <Play class="mr-1 h-4 w-4" />
              开始训练
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>

    <section class="mb-8">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-xl font-semibold tracking-tight">最近训练记录</h2>
        <Button variant="ghost" size="sm" @click="goToRecord">
          查看全部
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
      <div class="grid gap-3">
        <Card
          v-for="record in recentRecords"
          :key="record.title"
          class="cursor-pointer"
          @click="goToRecord"
        >
          <CardContent class="flex items-center justify-between p-4">
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-full"
                :class="record.completed ? 'bg-primary/10' : 'bg-muted'"
              >
                <Activity
                  class="h-5 w-5"
                  :class="record.completed ? 'text-primary' : 'text-muted-foreground'"
                />
              </div>
              <div class="grid gap-0.5">
                <p class="font-medium">{{ record.title }}</p>
                <p class="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar class="h-3 w-3" />
                  {{ record.date }}
                  <Clock class="h-3 w-3" />
                  {{ record.duration }}
                </p>
              </div>
            </div>
            <Badge :variant="record.completed ? 'default' : 'secondary'">
              {{ record.completed ? "已完成" : "进行中" }}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </section>

    <Separator class="my-6" />

    <section>
      <div class="mb-4">
        <h2 class="text-xl font-semibold tracking-tight">常用训练分类</h2>
      </div>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        <Card
          v-for="category in categories"
          :key="category.name"
          class="cursor-pointer hover:bg-accent"
          @click="goToCategory()"
        >
          <CardContent class="flex items-center justify-between p-4">
            <span class="font-medium">{{ category.name }}</span>
            <Badge variant="secondary">{{ category.count }}</Badge>
          </CardContent>
        </Card>
      </div>
    </section>
  </main>
</template>