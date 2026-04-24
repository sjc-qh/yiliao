import express from 'express';
import cors from 'cors';
import authRoutes from './src/routes/auth.routes.js';
import trainingRoutes from './src/routes/training.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import childRoutes from './src/routes/child.routes.js';
import elderRoutes from './src/routes/elder.routes.js';
import publicRoutes from './src/routes/public.routes.js';
import aiRoutes from './src/routes/ai.routes.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/elder', elderRoutes);
app.use('/api/child', childRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/ai', aiRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: '服务运行正常' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '服务器运行正常' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
});
