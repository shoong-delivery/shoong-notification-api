import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use(cors());

// Health Check
app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok' }));

// 알림 전송: POST /
app.post('/', async (req: Request, res: Response) => {
  try {
    const { type, message, user_id, order_id } = req.body as {
      type: string;
      message: string;
      user_id: number;
      order_id: number;
    };

    console.log(`[notification] type=${type} order_id=${order_id} message=${message}`);

    const notification = await prisma.notification.create({
      data: { user_id, order_id, message, type, is_read: false },
    });

    res.status(201).json({ success: true, data: notification });
  } catch (err) {
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
      alarms: notifications.map((n) => ({
        id: String(n.id),
        message: n.message,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

const server = app.listen(process.env.PORT, () =>
  console.log(`[notification-service] :${process.env.PORT}`)
);

process.on('SIGTERM', async () => {
  console.log('[notification-service] SIGTERM received, shutting down...');
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});
