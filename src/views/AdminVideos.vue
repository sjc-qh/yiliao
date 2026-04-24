<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "@/services/api";
import type { TrainingVideo } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const videos = ref<TrainingVideo[]>([]);
const loading = ref(false);
const searchTitle = ref("");
const filterCategory = ref("");
const filterStatus = ref("");

const editingVideo = ref<TrainingVideo | null>(null);
const editForm = ref({
  url: "",
  cover_url: "",
  description: "",
});
const showEditDialog = ref(false);

const loadVideos = async () => {
  loading.value = true;
  const response = await api.getVideos({
    category_id: filterCategory.value ? parseInt(filterCategory.value) : undefined,
    status: filterStatus.value,
    limit: 100,
  });

  if (response.success && response.data) {
    let filteredVideos = response.data;
    if (searchTitle.value) {
      filteredVideos = filteredVideos.filter(video =>
        video.title.toLowerCase().includes(searchTitle.value.toLowerCase())
      );
    }
    videos.value = filteredVideos;
  }
  loading.value = false;
};

const updateVideoStatus = async (videoId: number, status: string) => {
  const newStatus = status === "active" ? "inactive" : "active";
  const response = await api.updateVideoStatus(videoId, newStatus);

  if (response.success) {
    const video = videos.value.find(v => v.id === videoId);
    if (video) {
      video.status = newStatus;
    }
  }
};

const openEditDialog = (video: TrainingVideo) => {
  editingVideo.value = video;
  editForm.value = {
    url: (video as any).video_url || (video as any).url || "",
    cover_url: (video as any).cover_url || "",
    description: (video as any).description || "",
  };
  showEditDialog.value = true;
};

const saveVideoEdit = async () => {
  if (!editingVideo.value) return;

  const response = await api.updateVideo(editingVideo.value.id, {
    url: editForm.value.url,
    cover_url: editForm.value.cover_url,
    description: editForm.value.description,
  });

  if (response.success) {
    showEditDialog.value = false;
    editingVideo.value = null;
    loadVideos();
  }
};

onMounted(() => {
  loadVideos();
});
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <Card>
      <CardHeader>
        <CardTitle class="text-2xl font-bold">视频管理</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="flex flex-wrap gap-4 mb-6">
          <div class="flex-1 min-w-[200px]">
            <Input
              v-model="searchTitle"
              placeholder="搜索视频标题"
              @keyup.enter="loadVideos"
              class="w-full"
            />
          </div>
          <select
            v-model="filterCategory"
            @change="loadVideos"
            class="px-3 py-2 border rounded-md"
          >
            <option value="">所有分类</option>
            <option value="1">关节舒缓</option>
            <option value="2">力量训练</option>
            <option value="3">平衡训练</option>
          </select>
          <select
            v-model="filterStatus"
            @change="loadVideos"
            class="px-3 py-2 border rounded-md"
          >
            <option value="">所有状态</option>
            <option value="active">上架</option>
            <option value="inactive">下架</option>
          </select>
          <Button @click="loadVideos">查询</Button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-gray-100">
                <th class="border px-4 py-2 text-left">ID</th>
                <th class="border px-4 py-2 text-left">标题</th>
                <th class="border px-4 py-2 text-left">视频URL</th>
                <th class="border px-4 py-2 text-left">时长</th>
                <th class="border px-4 py-2 text-left">状态</th>
                <th class="border px-4 py-2 text-left">创建时间</th>
                <th class="border px-4 py-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="video in videos" :key="video.id" class="hover:bg-gray-50">
                <td class="border px-4 py-2">{{ video.id }}</td>
                <td class="border px-4 py-2">{{ video.title }}</td>
                <td class="border px-4 py-2 max-w-[200px] truncate">
                  {{ (video as any).video_url || (video as any).url || "未设置" }}
                </td>
                <td class="border px-4 py-2">
                  {{ Math.floor(video.duration_seconds / 60) }}分钟
                </td>
                <td class="border px-4 py-2">
                  <Badge
                    :class="{
                      'bg-green-500': video.status === 'active',
                      'bg-red-500': video.status === 'inactive',
                    }"
                  >
                    {{ video.status === "active" ? "上架" : "下架" }}
                  </Badge>
                </td>
                <td class="border px-4 py-2">
                  {{ new Date(video.created_at).toLocaleString() }}
                </td>
                <td class="border px-4 py-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button variant="outline" size="sm">操作</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem @click="openEditDialog(video)">
                        编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        @click="updateVideoStatus(video.id, video.status)"
                      >
                        {{ video.status === "active" ? "下架" : "上架" }}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="videos.length === 0 && !loading" class="text-center py-8">
          <p class="text-gray-500">暂无视频数据</p>
        </div>

        <div v-if="loading" class="text-center py-8">
          <p class="text-gray-500">加载中...</p>
        </div>
      </CardContent>
    </Card>

    <div v-if="showEditDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card class="w-[500px] max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>编辑视频</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">标题</label>
              <Input :value="editingVideo?.title" disabled />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">视频URL（哔哩哔哩链接）</label>
              <Input
                v-model="editForm.url"
                placeholder="请输入哔哩哔哩视频链接"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">封面URL</label>
              <Input
                v-model="editForm.cover_url"
                placeholder="请输入封面图片链接"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">描述</label>
              <textarea
                v-model="editForm.description"
                class="w-full px-3 py-2 border rounded-md"
                rows="3"
                placeholder="请输入视频描述"
              ></textarea>
            </div>
            <div class="flex justify-end gap-2">
              <Button variant="outline" @click="showEditDialog = false">
                取消
              </Button>
              <Button @click="saveVideoEdit">
                保存
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>