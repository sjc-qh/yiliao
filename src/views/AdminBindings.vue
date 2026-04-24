<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "@/services/api";
import type { Binding } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const bindings = ref<Binding[]>([]);
const loading = ref(false);

const loadBindings = async () => {
  loading.value = true;
  const response = await api.getBindings();
  
  if (response.success && response.data) {
    bindings.value = response.data;
  }
  loading.value = false;
};

const deleteBinding = async (bindingId: number) => {
  if (confirm("确定要删除这个绑定关系吗？")) {
    const response = await api.deleteBinding(bindingId);
    
    if (response.success) {
      bindings.value = bindings.value.filter(b => b.id !== bindingId);
    }
  }
};

onMounted(() => {
  loadBindings();
});
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <Card>
      <CardHeader>
        <CardTitle class="text-2xl font-bold">绑定管理</CardTitle>
      </CardHeader>
      <CardContent>
        <!-- 绑定关系表格 -->
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-gray-100">
                <th class="border px-4 py-2 text-left">ID</th>
                <th class="border px-4 py-2 text-left">老人姓名</th>
                <th class="border px-4 py-2 text-left">子女姓名</th>
                <th class="border px-4 py-2 text-left">是否主联系人</th>
                <th class="border px-4 py-2 text-left">创建时间</th>
                <th class="border px-4 py-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="binding in bindings" :key="binding.id" class="hover:bg-gray-50">
                <td class="border px-4 py-2">{{ binding.id }}</td>
                <td class="border px-4 py-2">{{ binding.elder_name }}</td>
                <td class="border px-4 py-2">{{ binding.child_name }}</td>
                <td class="border px-4 py-2">
                  <Badge
                    :class="{
                      'bg-blue-500': binding.is_primary === 1,
                      'bg-gray-500': binding.is_primary === 0,
                    }"
                  >
                    {{ binding.is_primary === 1 ? "是" : "否" }}
                  </Badge>
                </td>
                <td class="border px-4 py-2">
                  {{ new Date(binding.created_at).toLocaleString() }}
                </td>
                <td class="border px-4 py-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    @click="deleteBinding(binding.id)"
                  >
                    删除
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 空状态 -->
        <div v-if="bindings.length === 0 && !loading" class="text-center py-8">
          <p class="text-gray-500">暂无绑定关系数据</p>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="text-center py-8">
          <p class="text-gray-500">加载中...</p>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
