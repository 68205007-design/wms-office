import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './lib/config.js';
import { FRONTEND_DIST, UPLOAD_DIR } from './lib/paths.js';
import prisma from './lib/prisma.js';
import { authenticate, authorize } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import materialRoutes from './routes/materials.js';
import stockInRoutes from './routes/stockIn.js';
import requisitionRoutes from './routes/requisitions.js';
import notificationRoutes from './routes/notifications.js';
import dashboardRoutes from './routes/dashboard.js';
import reportRoutes from './routes/reports.js';
import settingRoutes from './routes/settings.js';
import { categoriesRouter, departmentsRouter, unitsRouter } from './routes/masterData.js';

const app = express();
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
app.use(
  cors({
    origin(origin, cb) {
      // อนุญาต request ที่ไม่มี origin (curl, same-origin) และ origin ที่กำหนดใน CORS_ORIGIN
      if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} ไม่ได้รับอนุญาต`));
    },
  }),
);
app.use(express.json({ limit: '1mb' }));
if (config.env !== 'test') app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

app.use(
  '/api',
  rateLimit({ windowMs: 60 * 1000, limit: 600, standardHeaders: 'draft-7', legacyHeaders: false }),
);

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', time: new Date() });
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

app.use('/api/auth', authRoutes);
// ทุก route ด้านล่างต้องเข้าสู่ระบบ
app.use('/api', authenticate);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/units', unitsRouter);
app.use('/api/materials', materialRoutes);
app.use('/api/stock-in', stockInRoutes);
app.use('/api/requisitions', requisitionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', authorize('ADMIN', 'WAREHOUSE', 'APPROVER'), reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api', notFoundHandler);

// ถ้ามี frontend ที่ build แล้ว ให้ backend เสิร์ฟด้วย (deploy แบบ server เดียว)
if (fs.existsSync(path.join(FRONTEND_DIST, 'index.html'))) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res) => res.sendFile(path.join(FRONTEND_DIST, 'index.html')));
}

app.use(errorHandler);

export default app;
