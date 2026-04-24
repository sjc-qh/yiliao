<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import {
  ArrowLeft,
  Activity,
  Calendar,
  CheckCircle,
  Clock,
  Flame,
  Timer,
  XCircle,
} from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/services/api";

const router = useRouter();
const loading = ref(true);
const isLoggedIn = ref(!!api.getToken());

const stats = ref({
  totalDays: 0,
  totalMinutes: 0,
  currentStreak: 0,
  completionRate: 0,
  targetMinutes: 33, // 每日目标训练时长（分钟）
  todayDurationPercentage: [] as { title: string; duration: number; percentage: number }[],
});

// 时间范围选择
const timeRange = ref("7"); // 默认显示近7天
const timeRangeOptions: { value: string; label: string }[] = [
  { value: "today", label: "今日" },
  { value: "7", label: "近7天" },
  { value: "30", label: "近30天" },
  { value: "180", label: "半年" },
  { value: "365", label: "1年" },
];

type TrainingRecordItem = {
  title: string;
  duration: string;
  completed: boolean;
  targetDuration: number;
  actualDuration: number;
  completionRate: number;
};

type DayRecord = {
  date: string;
  dayOfWeek: string;
  trainings: TrainingRecordItem[];
};

const records = ref<DayRecord[]>([
  {
    date: "2026年3月26日",
    dayOfWeek: "周四",
    trainings: [
      {
        title: "肩颈活动训练",
        duration: "10分钟",
        completed: true,
        targetDuration: 10,
        actualDuration: 10,
        completionRate: 100,
      },
      {
        title: "手臂拉伸训练",
        duration: "8分钟",
        completed: true,
        targetDuration: 8,
        actualDuration: 8,
        completionRate: 100,
      },
    ],
  },
  {
    date: "2026年3月25日",
    dayOfWeek: "周三",
    trainings: [
      {
        title: "腿部力量训练",
        duration: "15分钟",
        completed: true,
        targetDuration: 15,
        actualDuration: 15,
        completionRate: 100,
      },
      {
        title: "全身放松训练",
        duration: "5分钟",
        completed: false,
        targetDuration: 5,
        actualDuration: 0,
        completionRate: 0,
      },
    ],
  },
  {
    date: "2026年3月24日",
    dayOfWeek: "周二",
    trainings: [
      {
        title: "肩颈活动训练",
        duration: "10分钟",
        completed: true,
        targetDuration: 10,
        actualDuration: 10,
        completionRate: 100,
      },
      {
        title: "手臂拉伸训练",
        duration: "8分钟",
        completed: true,
        targetDuration: 8,
        actualDuration: 8,
        completionRate: 100,
      },
      {
        title: "腿部力量训练",
        duration: "15分钟",
        completed: true,
        targetDuration: 15,
        actualDuration: 15,
        completionRate: 100,
      },
    ],
  },
  {
    date: "2026年3月23日",
    dayOfWeek: "周一",
    trainings: [
      {
        title: "关节舒缓训练",
        duration: "12分钟",
        completed: true,
        targetDuration: 12,
        actualDuration: 12,
        completionRate: 100,
      },
    ],
  },
  {
    date: "2026年3月22日",
    dayOfWeek: "周日",
    trainings: [],
  },
  {
    date: "2026年3月21日",
    dayOfWeek: "周六",
    trainings: [
      {
        title: "坐姿核心训练",
        duration: "10分钟",
        completed: true,
        targetDuration: 10,
        actualDuration: 10,
        completionRate: 100,
      },
      {
        title: "站立平衡训练",
        duration: "8分钟",
        completed: true,
        targetDuration: 8,
        actualDuration: 8,
        completionRate: 100,
      },
    ],
  },
]);

async function loadTrainingRecords() {
  const isLoggedIn = !!api.getToken();
  if (!isLoggedIn) {
    loading.value = false;
    return;
  }

  loading.value = true;
  try {
    // 根据选择的时间范围确定天数
    let days = 365; // 默认1年
    if (timeRange.value === "today") {
      days = 1;
    } else {
      days = Number.parseInt(timeRange.value);
    }

    const response = await api.getTrainingRecords(days);
    if (response.success && response.data) {
      // 直接使用后端返回的数据结构
      records.value = (response.data.records || []).map(
        (record: {
          date: string;
          dayOfWeek: string;
          trainings: {
            title: string;
            duration: string;
            completed: boolean;
            targetDuration?: number;
            actualDuration?: number;
            completionRate?: number;
          }[];
        }) => ({
          date: record.date,
          dayOfWeek: record.dayOfWeek,
          trainings: record.trainings.map((t) => ({
            title: t.title,
            duration: t.duration,
            completed: t.completed,
            targetDuration: t.targetDuration || 0,
            actualDuration: t.actualDuration || 0,
            completionRate: t.completionRate || 0,
          })),
        }),
      );

      // 更新统计数据
      if (response.data.stats) {
        stats.value = {
          totalDays: records.value.length,
          totalMinutes: response.data.stats.todayTotalMinutes || 0,
          currentStreak: stats.value.currentStreak,
          completionRate: response.data.stats.todayCompletionRate || 0,
          targetMinutes: response.data.stats.targetMinutesPerDay || 33,
          todayDurationPercentage: response.data.stats.todayDurationPercentage || [],
        };
      } else {
        calculateStats(records.value);
      }
    }
  } catch (error) {
    console.error("加载训练记录失败:", error);
  } finally {
    loading.value = false;
  }
}

function calculateStats(groupedRecords: DayRecord[]) {
  // 获取今天的日期字符串（格式：YYYY年M月D日）
  const today = new Date();
  const todayStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

  let todayActualMinutes = 0;
  const todayTrainingDetails: { title: string; duration: number; targetDuration: number }[] = [];

  groupedRecords.forEach((day: DayRecord) => {
    day.trainings.forEach((training: TrainingRecordItem) => {
      // 计算今日进度
      if (day.date === todayStr && training.actualDuration) {
        todayActualMinutes += training.actualDuration;
        todayTrainingDetails.push({
          title: training.title,
          duration: training.actualDuration,
          targetDuration: training.targetDuration,
        });
      }
    });
  });

  // 计算连续训练天数
  const currentStreak = calculateCurrentStreak(groupedRecords);

  // 计算完成率：今日实际训练时长 / 今日目标训练时长（固定33分钟）
  const completionRate =
    stats.value.targetMinutes > 0
      ? Math.round((todayActualMinutes / stats.value.targetMinutes) * 100)
      : 0;

  // 计算今日各训练项目的时长占比
  const todayDurationPercentage = todayTrainingDetails.map((training) => {
    const percentage =
      todayActualMinutes > 0 ? Math.round((training.duration / todayActualMinutes) * 100) : 0;
    return {
      title: training.title,
      duration: training.duration,
      percentage: percentage,
    };
  });

  stats.value = {
    totalDays: groupedRecords.length,
    totalMinutes: todayActualMinutes, // 显示今日训练时长
    currentStreak: currentStreak,
    completionRate: completionRate,
    targetMinutes: stats.value.targetMinutes,
    todayDurationPercentage: todayDurationPercentage,
  };
}

function handleTimeRangeChange(optionValue: string) {
  timeRange.value = optionValue;
  loadTrainingRecords();
}

function calculateCurrentStreak(groupedRecords: DayRecord[]) {
  if (groupedRecords.length === 0) return 0;

  // 将记录按日期排序（最新的在前）
  const sortedRecords = [...groupedRecords].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  let streak = 0;
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  // 检查今天是否有记录
  const todayStr = currentDate.toLocaleDateString("zh-CN");
  const hasTodayRecord = sortedRecords.some((record) => record.date === todayStr);

  if (!hasTodayRecord) {
    // 如果今天没有记录，从昨天开始计算
    currentDate.setDate(currentDate.getDate() - 1);
  }

  for (const record of sortedRecords) {
    const recordDate = new Date(record.date);
    recordDate.setHours(0, 0, 0, 0);

    const diffTime = currentDate.getTime() - recordDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === streak) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

onMounted(() => {
  loadTrainingRecords();
});

function goBack() {
  router.back();
}

function getTotalMinutes(day: (typeof records.value)[0]): number {
  return day.trainings.reduce((sum, t) => {
    return sum + (t.actualDuration || 0);
  }, 0);
}
</script>

<template>
  <main class="mx-auto w-[calc(100%-24px)] max-w-7xl py-6 sm:w-[calc(100%-48px)] sm:py-12">
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <Button variant="ghost" size="icon" @click="goBack">
          <ArrowLeft class="h-5 w-5" />
        </Button>
        <h1 class="text-2xl font-semibold tracking-tight">训练记录</h1>
      </div>
      <div class="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" class="w-45">
              {{ timeRangeOptions.find((opt) => opt.value === timeRange)?.label || "选择时间范围" }}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              v-for="option in timeRangeOptions"
              :key="option.value"
              @click="handleTimeRangeChange(option.value)"
            >
              {{ option.label }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <section class="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent class="flex items-center gap-3 p-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Calendar class="h-5 w-5 text-primary" />
          </div>
          <div>
            <p class="text-2xl font-semibold">{{ stats.totalDays }}</p>
            <p class="text-xs text-muted-foreground">训练天数</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="flex items-center gap-3 p-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Timer class="h-5 w-5 text-primary" />
          </div>
          <div>
            <p class="text-2xl font-semibold">{{ stats.totalMinutes }}</p>
            <p class="text-xs text-muted-foreground">今日训练分钟</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="flex items-center gap-3 p-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
            <Flame class="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p class="text-2xl font-semibold">{{ stats.currentStreak }}</p>
            <p class="text-xs text-muted-foreground">连续训练天数</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="flex items-center gap-3 p-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
            <Activity class="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p class="text-2xl font-semibold">{{ stats.completionRate }}%</p>
            <p class="text-xs text-muted-foreground">完成率</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="flex items-center gap-3 p-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
            <Timer class="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p class="text-2xl font-semibold">{{ stats.totalMinutes }}/{{ stats.targetMinutes }}</p>
            <p class="text-xs text-muted-foreground">今日进度</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="p-4">
          <div class="mb-3 flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
              <Clock class="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p class="font-medium">今日时长占比</p>
            </div>
          </div>
          <div class="space-y-2">
            <div v-for="item in stats.todayDurationPercentage" :key="item.title" class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span>{{ item.title }}</span>
                <span>{{ item.percentage }}%</span>
              </div>
              <Progress :value="item.percentage" class="h-1.5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </section>

    <Separator class="my-6" />

    <section v-if="isLoggedIn">
      <div class="mb-4">
        <h2 class="text-xl font-semibold tracking-tight">历史记录</h2>
        <p class="text-sm text-muted-foreground">最近的训练历史</p>
      </div>
      <div class="grid gap-4">
        <Card v-for="record in records" :key="record.date">
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <CardTitle class="text-base">{{ record.date }}</CardTitle>
                <Badge variant="outline">{{ record.dayOfWeek }}</Badge>
              </div>
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock class="h-4 w-4" />
                {{ getTotalMinutes(record) }}分钟
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div v-if="record.trainings.length === 0" class="py-2">
              <p class="text-sm text-muted-foreground">当日无训练记录</p>
            </div>
            <div v-else class="grid gap-2">
              <div
                v-for="training in record.trainings"
                :key="training.title"
                class="flex items-center justify-between rounded-lg border p-3"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-full"
                    :class="training.completed ? 'bg-primary/10' : 'bg-muted'"
                  >
                    <CheckCircle v-if="training.completed" class="h-4 w-4 text-primary" />
                    <XCircle v-else class="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span class="text-sm" :class="training.completed ? '' : 'text-muted-foreground'">
                    {{ training.title }}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-sm text-muted-foreground">{{ training.duration }}</span>
                  <Badge
                    variant="outline"
                    class="text-xs"
                    :class="
                      training.completionRate >= 100
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-yellow-500/10 text-yellow-500'
                    "
                  >
                    {{ training.completionRate }}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>

    <section v-else class="mt-6">
      <Card class="border-primary/50 bg-primary/5">
        <CardContent class="flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div class="text-lg font-medium">请登录以查看个人训练记录</div>
          <p class="text-sm text-muted-foreground">登录后可以查看个人训练历史和统计数据</p>
          <Button @click="router.push('/login')"> 立即登录 </Button>
        </CardContent>
      </Card>
    </section>
  </main>
</template>
