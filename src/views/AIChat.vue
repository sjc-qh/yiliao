<script setup lang="ts">
import { ref } from "vue";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const question = ref("");
const answer = ref("");
const loading = ref(false);

const handleAsk = async () => {
  if (!question.value.trim()) return;
  
  loading.value = true;
  try {
    const response = await api.askAI(question.value);
    if (response.success && response.data) {
      answer.value = response.data.answer;
    }
  } catch (error) {
    console.error('AI问答失败:', error);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <Card>
      <CardHeader>
        <CardTitle class="text-2xl font-bold">AI康复助手</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          <div>
            <label class="block mb-2 font-medium">请输入您的问题</label>
            <Input
              v-model="question"
              placeholder="例如：如何进行有效的康复训练？"
              class="w-full"
              @keyup.enter="handleAsk"
            />
          </div>
          
          <Button 
            @click="handleAsk" 
            :disabled="loading || !question.trim()"
          >
            {{ loading ? '思考中...' : '提问' }}
          </Button>
          
          <div v-if="answer" class="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 class="font-medium mb-2">AI回答：</h3>
            <p>{{ answer }}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>