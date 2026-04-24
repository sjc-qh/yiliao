<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api, type AdminUser } from "@/services/api";
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

const users = ref<AdminUser[]>([]);
const loading = ref(false);
const searchAccount = ref("");
const filterRole = ref("");
const filterStatus = ref("");

const loadUsers = async () => {
  loading.value = true;
  const response = await api.getUsers({
    account: searchAccount.value,
    role: filterRole.value,
    status: filterStatus.value,
  });
  
  if (response.success && response.data) {
    // 后端已经返回字符串状态，不需要再转换
    users.value = response.data;
  }
  loading.value = false;
};

const updateUserStatus = async (userId: number, status: string) => {
  console.log('=== 按钮被点击了 ===');
  console.log('userId:', userId);
  console.log('status:', status);
  
  const newStatus = status === "active" ? "inactive" : "active";
  console.log('newStatus:', newStatus);
  
  const response = await api.updateUserStatus(userId, newStatus);
  console.log('API响应:', response);
  
  if (response.success) {
    console.log('更新成功，重新加载列表');
    await loadUsers();
  } else {
    console.error("更新失败:", response.error);
  }
};

onMounted(() => {
  loadUsers();
});
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <Card>
      <CardHeader>
        <CardTitle class="text-2xl font-bold">用户管理</CardTitle>
      </CardHeader>
      <CardContent>
        <!-- 搜索和筛选 -->
        <div class="flex flex-wrap gap-4 mb-6">
          <div class="flex-1 min-w-[200px]">
            <Input
              v-model="searchAccount"
              placeholder="搜索账号"
              @keyup.enter="loadUsers"
              class="w-full"
            />
          </div>
          <select
            v-model="filterRole"
            @change="loadUsers"
            class="px-3 py-2 border rounded-md"
          >
            <option value="">所有角色</option>
            <option value="admin">管理员</option>
            <option value="elder">老人</option>
            <option value="child">子女</option>
          </select>
          <select
            v-model="filterStatus"
            @change="loadUsers"
            class="px-3 py-2 border rounded-md"
          >
            <option value="">所有状态</option>
            <option value="active">启用</option>
            <option value="inactive">禁用</option>
          </select>
          <Button @click="loadUsers">查询</Button>
        </div>

        <!-- 用户表格 -->
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-gray-100">
                <th class="border px-4 py-2 text-left">ID</th>
                <th class="border px-4 py-2 text-left">账号</th>
                <th class="border px-4 py-2 text-left">姓名</th>
                <th class="border px-4 py-2 text-left">角色</th>
                <th class="border px-4 py-2 text-left">状态</th>
                <th class="border px-4 py-2 text-left">创建时间</th>
                <th class="border px-4 py-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50">
                <td class="border px-4 py-2">{{ user.id }}</td>
                <td class="border px-4 py-2">{{ user.account }}</td>
                <td class="border px-4 py-2">{{ user.user_name }}</td>
                <td class="border px-4 py-2">
                  <Badge
                    :class="{
                      'bg-blue-500': user.role === 'admin',
                      'bg-green-500': user.role === 'elder',
                      'bg-purple-500': user.role === 'child',
                    }"
                  >
                    {{
                      user.role === "admin"
                        ? "管理员"
                        : user.role === "elder"
                        ? "老人"
                        : "子女"
                    }}
                  </Badge>
                </td>
                <td class="border px-4 py-2">
                  <Badge
                    :class="{
                      'bg-green-500': user.status === 'active',
                      'bg-red-500': user.status === 'inactive',
                    }"
                  >
                    {{ user.status === "active" ? "启用" : "禁用" }}
                  </Badge>
                </td>
                <td class="border px-4 py-2">
                  {{ new Date(user.created_at).toLocaleString() }}
                </td>
                <td class="border px-4 py-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button variant="outline" size="sm">操作</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        @click="updateUserStatus(user.id, String(user.status))"
                      >
                        {{ user.status === "active" ? "禁用" : "启用" }}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 空状态 -->
        <div v-if="users.length === 0 && !loading" class="text-center py-8">
          <p class="text-gray-500">暂无用户数据</p>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="text-center py-8">
          <p class="text-gray-500">加载中...</p>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
