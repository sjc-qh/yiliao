<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeft, ChevronRight, ChevronDown, Clock, Filter, FolderOpen } from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/services/api";

interface CategoryNode {
  id: number;
  name: string;
  parent_id: number | null;
  count: number;
  children?: CategoryNode[];
}

interface TrainingVideo {
  id: number;
  title: string;
  cover_url: string;
  video_url: string;
  description: string;
  duration_seconds: number;
  duration: string;
  categories?: { id: number; name: string }[];
}

const router = useRouter();
const loading = ref(true);
const categoryTree = ref<CategoryNode[]>([]);
const expandedIds = ref<Set<number>>(new Set());
const selectedLeafId = ref<number | null>(null);
const trainings = ref<TrainingVideo[]>([]);

function initExpanded(nodes: CategoryNode[]) {
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      expandedIds.value.add(node.id);
      initExpanded(node.children);
    }
  }
}

async function loadData() {
  loading.value = true;
  try {
    const categoriesRes = await api.getTrainingCategories();
    if (categoriesRes.success && categoriesRes.data) {
      // 去重顶级分类，确保每个顶级分类只显示一次
      const uniqueRoots = [];
      const seenNames = new Set();
      for (const node of categoriesRes.data) {
        if (!seenNames.has(node.name)) {
          seenNames.add(node.name);
          uniqueRoots.push(node);
        }
      }
      categoryTree.value = uniqueRoots;
      initExpanded(categoryTree.value);
    }
    const videosRes = await api.getTrainingVideos(undefined, 1, 100);
    if (videosRes.success && videosRes.data) {
      trainings.value = videosRes.data as TrainingVideo[];
    }
  } catch (error) {
    console.error("加载数据失败:", error);
  } finally {
    loading.value = false;
  }
}

function toggleNode(id: number) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id);
  } else {
    expandedIds.value.add(id);
  }
}

function selectCategory(id: number) {
  selectedLeafId.value = id;
  loadVideos(id);
}

async function loadVideos(categoryId: number) {
  loading.value = true;
  try {
    const response = await api.getTrainingVideos(categoryId, 1, 100);
    if (response.success && response.data) {
      trainings.value = response.data as TrainingVideo[];
    }
  } catch (error) {
    console.error("加载视频失败:", error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});

function goBack() {
  router.back();
}

function goToTraining(id: number) {
  router.push(`/training/${id}`);
}

function getCategoryName(categories?: { id: number; name: string }[]): string {
  return categories?.[0]?.name || "未分类";
}

function clearFilter() {
  selectedLeafId.value = null;
  loadData();
}
</script>

<template>
  <main class="mx-auto w-[calc(100%-24px)] max-w-7xl py-6 sm:w-[calc(100%-48px)] sm:py-12">
    <div class="mb-6 flex items-center gap-4">
      <Button variant="ghost" size="icon" @click="goBack">
        <ArrowLeft class="h-5 w-5" />
      </Button>
      <h1 class="text-2xl font-semibold tracking-tight">训练分类</h1>
    </div>

    <section class="mb-8">
      <div class="mb-4 flex items-center gap-2">
        <Filter class="h-4 w-4 text-muted-foreground" />
        <span class="text-sm font-medium">筛选分类</span>
        <Button v-if="selectedLeafId" variant="ghost" size="sm" class="ml-2" @click="clearFilter">
          清除筛选
        </Button>
      </div>

      <div class="space-y-3">
        <template v-for="group in categoryTree" :key="group.id">
          <div v-if="group.children && group.children.length > 0" class="rounded-lg border bg-card">
            <button
              class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
              @click="toggleNode(group.id)"
            >
              <div class="flex items-center gap-2">
                <FolderOpen class="h-5 w-5 text-primary" />
                <span class="font-medium">{{ group.name }}</span>
                <Badge variant="secondary" class="ml-2">{{ group.children.length }}</Badge>
              </div>
              <ChevronDown
                class="h-4 w-4 text-muted-foreground transition-transform duration-200"
                :class="{ 'rotate-180': expandedIds.has(group.id) }"
              />
            </button>

            <div v-if="expandedIds.has(group.id)" class="border-t px-4 py-3">
              <div class="space-y-3">
                <div v-for="sub1 in group.children" :key="sub1.id">
                  <div v-if="sub1.children && sub1.children.length > 0" class="ml-4">
                    <button
                      class="flex w-full items-center justify-between py-2 text-left hover:text-primary"
                      @click="toggleNode(sub1.id)"
                    >
                      <div class="flex items-center gap-2">
                        <span class="font-medium">{{ sub1.name }}</span>
                        <Badge variant="outline" class="text-xs">{{ sub1.count }}</Badge>
                      </div>
                      <ChevronRight
                        class="h-4 w-4 transition-transform duration-200"
                        :class="{ 'rotate-90': expandedIds.has(sub1.id) }"
                      />
                    </button>

                    <div v-if="expandedIds.has(sub1.id)" class="ml-4 space-y-1">
                      <button
                        v-for="sub2 in sub1.children"
                        :key="sub2.id"
                        class="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors"
                        :class="selectedLeafId === sub2.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
                        @click="selectCategory(sub2.id)"
                      >
                        <span>{{ sub2.name }}</span>
                        <Badge :variant="selectedLeafId === sub2.id ? 'outline' : 'secondary'" class="text-xs">
                          {{ sub2.count }}
                        </Badge>
                      </button>
                    </div>
                  </div>

                  <button
                    v-else
                    class="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ml-4"
                    :class="selectedLeafId === sub1.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
                    @click="selectCategory(sub1.id)"
                  >
                    <span>{{ sub1.name }}</span>
                    <Badge :variant="selectedLeafId === sub1.id ? 'outline' : 'secondary'" class="text-xs">
                      {{ sub1.count }}
                    </Badge>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </section>

    <section>
      <div class="mb-4">
        <h2 class="text-xl font-semibold tracking-tight">
          {{ selectedLeafId ? '筛选结果' : '全部训练' }}
        </h2>
        <p class="text-sm text-muted-foreground">共 {{ trainings.length }} 个训练项目</p>
      </div>
      <div v-if="trainings.length === 0 && !loading" class="py-12 text-center text-muted-foreground">
        暂无训练项目
      </div>
      <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card
          v-for="training in trainings"
          :key="training.id"
          class="cursor-pointer"
          @click="goToTraining(training.id)"
        >
          <CardHeader class="pb-2">
            <div class="flex items-center justify-between">
              <Badge variant="secondary">{{ getCategoryName(training.categories) }}</Badge>
              <div class="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock class="h-3 w-3" />
                {{ training.duration }}
              </div>
            </div>
            <CardTitle class="mt-2">{{ training.title }}</CardTitle>
            <CardDescription>{{ training.description }}</CardDescription>
          </CardHeader>
          <CardContent class="grid gap-2">
            <div class="flex items-center justify-between">
              <Badge variant="secondary">入门</Badge>
              <Button variant="ghost" size="sm">
                开始训练
                <ChevronRight class="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  </main>
</template>
