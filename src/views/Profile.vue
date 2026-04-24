<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeft, LogOut, User, Key } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api } from "@/services/api";

const router = useRouter();
const activeTab = ref("profile");
const loading = ref(true);
const error = ref("");
const success = ref("");

const userInfo = ref({
  id: 0,
  account: "",
  user_name: "",
  role: "",
  gender: undefined as string | undefined,
  phone: undefined as string | undefined,
  age: undefined as number | undefined,
  created_at: undefined as string | undefined,
});

const passwordForm = ref({
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
});

async function loadUserInfo() {
  loading.value = true;
  try {
    const token = api.getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const response = await api.getUserProfile();
    if (response.success && response.data) {
      userInfo.value = {
        id: response.data.id,
        account: response.data.account,
        user_name: response.data.user_name,
        role: response.data.role,
        gender: response.data.gender,
        phone: response.data.phone,
        age: response.data.age,
        created_at: response.data.created_at,
      };
    } else {
      error.value = response.error || "加载用户信息失败";
    }
  } catch (err) {
    console.error(err);
    error.value = "加载用户信息失败";
  } finally {
    loading.value = false;
  }
}

async function updateProfile() {
  loading.value = true;
  error.value = "";
  success.value = "";
  try {
    const response = await api.updateUserProfile({
      user_name: userInfo.value.user_name,
      gender: userInfo.value.gender || "",
      phone: userInfo.value.phone || "",
      age: userInfo.value.age || 0,
    });

    if (response.success) {
      success.value = response.data?.message || "个人资料更新成功";
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      //同步更新个人资料
      localStorage.setItem('user', JSON.stringify({
        ...currentUser,
        user_name: userInfo.value.user_name,
        gender: userInfo.value.gender,
        phone: userInfo.value.phone,
        age: userInfo.value.age
      }));
    } else {
      error.value = response.error || "更新失败";
    }
  } catch (err) {
    console.error(err);
    error.value = "更新失败";
  } finally {
    loading.value = false;
  }
}

async function changePassword() {
  loading.value = true;
  error.value = "";
  success.value = "";

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    error.value = "两次输入的密码不一致";
    loading.value = false;
    return;
  }

  try {
    const response = await api.changePassword({
      oldPassword: passwordForm.value.oldPassword,
      newPassword: passwordForm.value.newPassword,
    });

    if (response.success) {
      success.value = response.data?.message || "密码修改成功";
      passwordForm.value = { oldPassword: "", newPassword: "", confirmPassword: "" };
    } else {
      error.value = response.error || "密码修改失败";
    }
  } catch (err) {
    console.error(err);
    error.value = "密码修改失败";
  } finally {
    loading.value = false;
  }
}

function logout() {
  api.clearToken();
  localStorage.removeItem("user");
  router.push("/login");
}

onMounted(() => {
  loadUserInfo();
});
</script>

<template>
  <main class="mx-auto w-[calc(100%-24px)] max-w-4xl py-6 sm:w-[calc(100%-48px)] sm:py-12">
    <div class="mb-6 flex items-center gap-4">
      <Button variant="ghost" size="icon" @click="router.back">
        <ArrowLeft class="h-5 w-5" />
      </Button>
      <h1 class="text-2xl font-semibold tracking-tight">个人中心</h1>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <div class="lg:col-span-1">
        <Card>
          <CardContent class="p-6">
            <div class="flex flex-col items-center gap-4">
              <div class="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <User class="h-10 w-10 text-primary" />
              </div>
              <div class="text-center">
                <h2 class="text-xl font-semibold">{{ userInfo.user_name }}</h2>
                <p class="text-sm text-muted-foreground">
                  {{
                    userInfo.role === "elder"
                      ? "老人"
                      : userInfo.role === "child"
                        ? "子女"
                        : "管理员"
                  }}
                </p>
              </div>
              <Separator class="my-4 w-full" />
              <div class="w-full space-y-2 text-sm">
                <div class="flex items-center justify-between">
                  <span class="text-muted-foreground">账号</span>
                  <span>{{ userInfo.account }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-muted-foreground">注册时间</span>
                  <span>{{
                    userInfo.created_at
                      ? new Date(userInfo.created_at).toLocaleDateString("zh-CN")
                      : "未知"
                  }}</span>
                </div>
              </div>
              <Button variant="destructive" class="mt-4 w-full" @click="logout">
                <LogOut class="mr-2 h-4 w-4" />
                退出登录
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="lg:col-span-2">
        <div class="mb-4 flex gap-2">
          <Button
            variant="outline"
            :class="{ 'bg-primary text-primary-foreground': activeTab === 'profile' }"
            @click="activeTab = 'profile'"
          >
            <User class="mr-2 h-4 w-4" />
            个人资料
          </Button>
          <Button
            variant="outline"
            :class="{ 'bg-primary text-primary-foreground': activeTab === 'password' }"
            @click="activeTab = 'password'"
          >
            <Key class="mr-2 h-4 w-4" />
            修改密码
          </Button>
        </div>

        <Card v-if="activeTab === 'profile'">
          <CardHeader>
            <CardTitle>个人资料</CardTitle>
            <CardDescription>管理您的个人信息</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div v-if="error" class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {{ error }}
            </div>
            <div v-if="success" class="rounded-lg bg-green-500/10 p-3 text-sm text-green-500">
              {{ success }}
            </div>

            <div class="space-y-2">
              <Label for="user_name">姓名</Label>
              <Input id="user_name" v-model="userInfo.user_name" placeholder="请输入姓名" />
            </div>

            <div class="space-y-2">
              <Label for="gender">性别</Label>
              <div class="flex gap-2">
                <Button
                  variant="outline"
                  :class="{ 'bg-primary text-primary-foreground': userInfo.gender === '男' }"
                  @click="userInfo.gender = '男'"
                >
                  男
                </Button>
                <Button
                  variant="outline"
                  :class="{ 'bg-primary text-primary-foreground': userInfo.gender === '女' }"
                  @click="userInfo.gender = '女'"
                >
                  女
                </Button>
              </div>
            </div>

            <div class="space-y-2">
              <Label for="phone">手机号</Label>
              <Input id="phone" v-model="userInfo.phone" placeholder="请输入手机号" />
            </div>

            <div class="space-y-2">
              <Label for="age">年龄</Label>
              <Input
                id="age"
                v-model.number="userInfo.age"
                type="number"
                placeholder="请输入年龄"
              />
            </div>

            <Button class="w-full" :disabled="loading" @click="updateProfile"> 保存资料 </Button>
          </CardContent>
        </Card>

        <Card v-else>
          <CardHeader>
            <CardTitle>修改密码</CardTitle>
            <CardDescription>设置新的登录密码</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div v-if="error" class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {{ error }}
            </div>
            <div v-if="success" class="rounded-lg bg-green-500/10 p-3 text-sm text-green-500">
              {{ success }}
            </div>

            <div class="space-y-2">
              <Label for="oldPassword">原密码</Label>
              <Input
                id="oldPassword"
                v-model="passwordForm.oldPassword"
                type="password"
                placeholder="请输入原密码"
              />
            </div>

            <div class="space-y-2">
              <Label for="newPassword">新密码</Label>
              <Input
                id="newPassword"
                v-model="passwordForm.newPassword"
                type="password"
                placeholder="请输入新密码"
              />
            </div>

            <div class="space-y-2">
              <Label for="confirmPassword">确认新密码</Label>
              <Input
                id="confirmPassword"
                v-model="passwordForm.confirmPassword"
                type="password"
                placeholder="请再次输入新密码"
              />
            </div>

            <Button class="w-full" :disabled="loading" @click="changePassword"> 修改密码 </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </main>
</template>
