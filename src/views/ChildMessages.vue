<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Bell, Send, User, MessageCircle, AlertCircle } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/services/api";

interface Elder {
  id: number;
  user_name: string;
  avatar?: string;
}

interface Reminder {
  id: number;
  elderId: number;
  elderName: string;
  content: string;
  createdAt: string;
  status: string;
}

const router = useRouter();
const loading = ref(true);
const elders = ref<Elder[]>([]);
const selectedElder = ref<number | null>(null);
const reminderContent = ref("");
const reminders = ref<Reminder[]>([]);

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
        selectedElder.value = elders.value[0].id;
        await loadReminders();
      }
    }
  } catch (error) {
    console.error("加载老人列表失败:", error);
  } finally {
    loading.value = false;
  }
}

async function loadReminders() {
  if (!selectedElder.value) return;
  
  try {
    const response = await api.getLatestReminder(selectedElder.value);
    if (response.success && response.data) {
      const data = response.data;
      if (data.latest_reminder) {
        reminders.value = [{
          id: data.latest_reminder.id,
          elderId: selectedElder.value!,
          elderName: elders.value.find(e => e.id === selectedElder.value)?.user_name || "未知",
          content: data.latest_reminder.content,
          createdAt: data.latest_reminder.created_at ? new Date(data.latest_reminder.created_at).toLocaleString('zh-CN') : "",
          status: "sent"
        }];
      }
    }
  } catch (error) {
    console.error("加载提醒记录失败:", error);
  }
}

async function sendReminder() {
  if (!selectedElder.value || !reminderContent.value.trim()) {
    return;
  }
  
  try {
    const response = await api.sendTrainingReminder(selectedElder.value, reminderContent.value.trim());
    if (response.success) {
      const elder = elders.value.find(e => e.id === selectedElder.value);
      if (!elder) return;
      
      const newReminder: Reminder = {
        id: Date.now(),
        elderId: selectedElder.value,
        elderName: elder.user_name,
        content: reminderContent.value.trim(),
        createdAt: new Date().toLocaleString('zh-CN'),
        status: "sent"
      };
      
      reminders.value.unshift(newReminder);
      reminderContent.value = "";
    }
  } catch (error) {
    console.error("发送提醒失败:", error);
  }
}

function goBack() {
  router.push("/child");
}

onMounted(() => {
  loadElders();
});
</script>

<template>
  <main class="mx-auto w-[calc(100%-24px)] max-w-7xl py-6 sm:w-[calc(100%-48px)] sm:py-12">
    <div class="mb-6 flex items-center gap-4">
      <Button variant="ghost" size="icon" @click="goBack">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </Button>
      <h1 class="text-2xl font-semibold tracking-tight">消息中心</h1>
    </div>

    <!-- 发送提醒 -->
    <Card class="mb-6">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <MessageCircle class="h-5 w-5" />
          发送训练提醒
        </CardTitle>
        <CardDescription>向老人发送训练提醒，督促他们完成康复训练</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">选择老人</label>
          <select 
            v-model="selectedElder"
            class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>请选择老人</option>
            <option v-for="elder in elders" :key="elder.id" :value="elder.id">
              {{ elder.user_name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2">提醒内容</label>
          <textarea 
            v-model="reminderContent"
            placeholder="输入提醒内容，例如：记得今天完成康复训练哦！"
            class="w-full min-h-[120px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          ></textarea>
        </div>
        <Button @click="sendReminder" class="w-full gap-2" :disabled="!selectedElder || !reminderContent.trim()">
          <Send class="h-4 w-4" />
          发送提醒
        </Button>
      </CardContent>
    </Card>

    <!-- 提醒记录 -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Bell class="h-5 w-5" />
          提醒记录
        </CardTitle>
        <CardDescription>查看历史提醒记录</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="reminders.length === 0" class="text-center py-8">
          <AlertCircle class="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p class="text-muted-foreground">暂无提醒记录</p>
        </div>
        <div v-else class="space-y-4">
          <div 
            v-for="reminder in reminders" 
            :key="reminder.id"
            class="flex items-start gap-4 p-4 rounded-lg border"
          >
            <div class="flex-shrink-0">
              <div class="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User class="h-5 w-5 text-primary" />
              </div>
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between mb-1">
                <h3 class="font-medium">{{ reminder.elderName }}</h3>
                <span class="text-xs text-muted-foreground">{{ reminder.createdAt }}</span>
              </div>
              <p class="text-sm mb-2">{{ reminder.content }}</p>
              <div class="flex items-center gap-2">
                <span 
                  class="text-xs px-2 py-1 rounded-full" 
                  :class="reminder.status === 'sent' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'"
                >
                  {{ reminder.status === 'sent' ? '已发送' : '发送中' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </main>
</template>