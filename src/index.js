require('dotenv').config();
const express = require('express');
const { prisma } = require('../database');

const app = express();
app.use(express.json());

// 알림 전송: POST /notify
app.post('/notify', async (req, res) => {
  try {
    const { type, message, user_id, order_id } = req.body;

    console.log(`[notification] type=${type} order_id=${order_id} message=${message}`);

    const notification = await prisma.notification.create({
      data: {
        user_id,
        order_id,
        message,
        type,
        is_read: false,
      },
    });

    res.status(201).json({ success: true, data: notification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 알림 조회: GET /notify/:orderId
app.get('/notify/:orderId', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { order_id: Number(req.params.orderId) },
      orderBy: { created_at: 'asc' },
    });
    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(process.env.PORT, () =>
  console.log(`[notification-service] :${process.env.PORT}`)
);