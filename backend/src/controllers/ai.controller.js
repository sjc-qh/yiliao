import * as aiService from '../services/ai.service.js';

export async function askAI(req, res) {
    try {
        const { question } = req.body;
        const result = await aiService.askAI(question);
        res.json({
            success: true,
            data: result
    });
    } catch (error) {
        console.error('AI问答错误:', error);
        res.status(400).json({ success: false, error: error.message || '问答失败' });
    }
}