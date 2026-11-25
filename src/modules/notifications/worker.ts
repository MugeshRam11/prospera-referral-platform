import 'dotenv/config';
import { setTimeout as delay } from 'node:timers/promises';
import { prisma } from '../../lib/prisma';
import { deliverOne } from './delivery';
import { smtpTransport } from './transport';

async function main() {
  const send = smtpTransport();
  if (!send) { console.info('Notification delivery disabled'); return; }
  let stopping = false;
  process.once('SIGTERM', () => { stopping = true; });
  process.once('SIGINT', () => { stopping = true; });
  while (!stopping) {
    try { if (await deliverOne(send)) continue; }
    catch { console.error('Notification queue unavailable'); }
    await delay(2000);
  }
}

main().catch(() => { console.error('Notification worker startup failed'); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
