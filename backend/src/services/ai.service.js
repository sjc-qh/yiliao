import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const client = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

export async function askAI(question) {
    if (!question || !question.trim()) {
        throw new Error('问题不能为空');
    }

    try {
        const completion = await client.chat.completions.create({
            model: 'qwen-turbo',
            messages: [
                { role: 'system', content: '你是一个专业的康复训练助手，为老人和子女提供康复训练相关的专业建议和回答' },
                { role: 'user', content: question }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        if (completion.choices && completion.choices[0] && completion.choices[0].message) {
            return {
                answer: completion.choices[0].message.content
            };
        } else {
            throw new Error('AI回答生成失败');
        }
    } catch (error) {
        console.error('AI问答错误:', error);
        throw new Error('AI服务调用失败: ' + error.message);
    }
}