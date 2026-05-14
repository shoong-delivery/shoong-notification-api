import { Counter, Registry, collectDefaultMetrics } from 'prom-client';

export const registry = new Registry();

collectDefaultMetrics({ register: registry });

// 알림 생성 시도 횟수
// type: order / kitchen / delivery 등
// result: success / fail
export const notificationCreateTotal = new Counter({
  name: 'notification_create_total',
  help: 'Total notification creation attempts',
  labelNames: ['type', 'result'] as const,
  registers: [registry],
});
