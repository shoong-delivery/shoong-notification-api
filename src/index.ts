import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { registry, notificationCreateTotal } from './metrics';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use(cors());

// Health Check
app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok' }));

// Prometheus 스크랩 엔드포인트
app.get('/metrics', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  } catch (err) {
    console.error('[metrics] error -', (err as Error).message);
    res.status(500).end();
  }
});

// 알림 전송: POST /
app.post('/', async (req: Request, res: Response) => {
  const { type, message, user_id, order_id } = req.body as {
    type: string;
    message: string;
    user_id: number;
    order_id: number;
  };

  try {
    console.log(`[notification] type=${type} order_id=${order_id} message=${message}`);

    const notification = await prisma.notification.create({
      data: { user_id, order_id, message, type, is_read: false },
    });

    notificationCreateTotal.labels(type ?? 'unknown', 'success').inc();
    res.status(201).json({ success: true, data: notification });
  } catch (err) {
    notificationCreateTotal.labels(type ?? 'unknown', 'fail').inc();
    console.error(err);
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// 알림 조회: GET /?userName={userName}
app.get('/', async (req: Request, res: Response) => {
  try {
    const { userName } = req.query as { userName: string };

    const user = await prisma.user.findUnique({ where: { username: userName } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const notifications = await prisma.notification.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
    });

    res.json({
      alarms: notifications.map((n: { id: number; message: string }) => ({
        id: String(n.id),
        message: n.message,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

const PORT = process.env.PORT || 3004;
const server = app.listen(PORT, () =>
  console.log(`[notification-service] :${PORT}`)
);

process.on('SIGTERM', async () => {
  console.log('[notification-service] SIGTERM received, shutting down...');
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});
