<template>
  <main class="mx-auto w-[calc(100%-24px)] max-w-4xl py-6 sm:w-[calc(100%-48px)] sm:py-12">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-semibold tracking-tight">消息中心</h1>
      <Button @click="goBack" class="gap-2">
        <ArrowLeft class="h-4 w-4" />
        返回
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>收到的消息</CardTitle>
        <CardDescription>来自子女的训练提醒和其他消息</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="flex items-center justify-center py-12">
          <div class="text-center">
            <Loader class="h-8 w-8 mx-auto mb-4 animate-spin" />
            <p class="text-sm text-muted-foreground">加载消息中...</p>
          </div>
        </div>

        <div v-else-if="messages.length === 0" class="text-center py-12">
          <Bell class="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 class="text-lg font-medium mb-2">暂无消息</h3>
          <p class="text-muted-foreground">当子女发送训练提醒时，会显示在这里</p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="message in messages"
            :key="message.id"
            class="group relative rounded-lg border p-4 transition-all hover:bg-accent/50 cursor-pointer"
            :class="message.is_read ? 'border-muted' : 'border-primary bg-primary/5'"
            @click="markAsRead(message.id)"
          >
            <div class="flex items-start space-x-3">
              <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bell class="h-5 w-5" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <p class="font-medium text-foreground truncate">
                    {{ message.sender.user_name }}
                  </p>
                  <span class="text-xs text-muted-foreground">
                    {{ formatTime(message.created_at) }}
                  </span>
                </div>
                <p class="mt-1 text-sm text-foreground">
                  {{ message.content }}
                </p>
              </div>
            </div>
            <div v-if="!message.is_read" class="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Bell, Loader } from 'lucide-vue-next';
import { api } from '@/services/api';

interface Sender {
  id: number;
  role: string;
  user_name: string;
}

interface Message {
  id: number;
  title: string;
  content: string;
  type: string;
  biz_date: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  sender: Sender;
}

const router = useRouter();
const loading = ref(true);
const messages = ref<Message[]>([]);

async function loadMessages() {
  loading.value = true;
  try {
    const response = await api.getNotifications();
    if (response.success && response.data) {
      messages.value = response.data.map((item: any) => ({
        ...item,
        is_read: item.is_read === 1
      }));
    }
  } catch (error) {
    console.error('加载消息失败:', error);
  } finally {
    loading.value = false;
  }
}

async function markAsRead(notificationId: number) {
  try {
    const response = await api.markNotificationRead(notificationId);
    if (response.success) {
      // 更新本地消息状态
      const message = messages.value.find(m => m.id === notificationId);
      if (message) {
        message.is_read = true;
      }
    }
  } catch (error) {
    console.error('标记已读失败:', error);
  }
}

function formatTime(time: string) {
  const date = new Date(time);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (days < 7) {
    return days + '天前';
  } else {
    return date.toLocaleDateString('zh-CN');
  }
}

function goBack() {
  router.back();
}

onMounted(() => {
  loadMessages();
});
</script>