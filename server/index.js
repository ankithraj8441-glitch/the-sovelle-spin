import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { initDatabase } from './db.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';

initDatabase();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', brand: 'SOVELLE', app: 'THE SOVELLE SPIN' });
});

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

// Serve built frontend in production (or when dist exists)
const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

export { app };

if (!process.env.SKIP_LISTEN) {
  app.listen(PORT, () => {
    console.log(`THE SOVELLE SPIN server running at http://localhost:${PORT}`);
  });
}
