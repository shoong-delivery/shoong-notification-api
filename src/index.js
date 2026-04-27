require("dotenv").config();
const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const app = express();
app.use(express.json());

const cors = require("cors");
app.use(cors());

// Health Check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// 알림 전송: POST /
app.post("/", async (req, res) => {
  try {
    const { type, message, user_id, order_id } = req.body;

    console.log(
      `[notification] type=${type} order_id=${order_id} message=${message}`,
    );

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

// 알림 조회: GET /?userName={userName}
app.get("/", async (req, res) => {
  try {
    const { userName } = req.query;

    const user = await prisma.user.findUnique({
      where: { username: userName },
    });

    if (!user)
      return res.status(404).json({ success: false, error: "User not found" });

    const notifications = await prisma.notification.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: "desc" },
    });

    res.json({
      alarms: notifications.map((n) => ({
        id: String(n.id),
        message: n.message,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


const server = app.listen(process.env.PORT, () =>
  console.log(`[notification-service] :${process.env.PORT}`)
);

process.on("SIGTERM", async () => {
  console.log("[notification-service] SIGTERM received, shutting down...");
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});

