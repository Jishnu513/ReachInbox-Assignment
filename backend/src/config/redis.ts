import Redis from 'ioredis';
import { env } from './env';

// Upstash requires TLS (rediss://) — ioredis handles it automatically
// when the URL starts with rediss://
function createClient() {
  const url = env.REDIS_URL;
  const isTLS = url.startsWith('rediss://');

  return new Redis(url, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
    tls: isTLS ? { rejectUnauthorized: false } : undefined,
  });
}

export const redis = createClient();

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});

// Separate connection for BullMQ (BullMQ requires its own connections)
export function createRedisConnection() {
  const url = env.REDIS_URL;
  const isTLS = url.startsWith('rediss://');

  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: isTLS ? { rejectUnauthorized: false } : undefined,
  });
}
