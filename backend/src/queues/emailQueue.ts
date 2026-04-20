import { Queue, QueueOptions } from 'bullmq';
import { createRedisConnection } from '../config/redis';

const connection = createRedisConnection();

const queueOptions: QueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s, 10s, 20s
    },
    removeOnComplete: {
      count: 1000, // keep last 1000 completed jobs for audit
    },
    removeOnFail: {
      count: 500,
    },
  },
};

export const emailQueue = new Queue('email-queue', queueOptions);

export interface EmailJobData {
  emailJobId: string;
}

console.log('✅ BullMQ email queue initialized');
