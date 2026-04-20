import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { prisma } from '../config/database';
import { sendEmail } from '../config/mailer';
import { checkAndIncrRateLimit, getNextHourStart } from '../services/rateLimitService';
import { emailQueue, EmailJobData } from './emailQueue';
import { env } from '../config/env';

async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { emailJobId } = job.data;

  console.log(`🔄 Processing job ${job.id} for emailJob ${emailJobId}`);

  // --- 1. IDEMPOTENCY CHECK ---
  const emailJob = await prisma.emailJob.findUnique({
    where: { id: emailJobId },
    include: { campaign: true },
  });

  if (!emailJob) {
    console.warn(`⚠️ EmailJob ${emailJobId} not found in DB — skipping`);
    return;
  }

  if (emailJob.status === 'sent') {
    console.log(`✅ EmailJob ${emailJobId} already sent — skipping (idempotency)`);
    return;
  }

  const campaign = emailJob.campaign;

  // --- 2. RATE LIMIT CHECK ---
  const allowed = await checkAndIncrRateLimit(campaign.senderEmail, campaign.hourlyLimit);

  if (!allowed) {
    const nextHour = getNextHourStart();
    const delay = nextHour - Date.now();

    console.log(
      `🚦 Rate limit reached for ${campaign.senderEmail} — rescheduling ${emailJobId} to next hour (+${Math.round(delay / 1000)}s)`,
    );

    // Re-enqueue into next hour window — preserve data, use unique job id
    await emailQueue.add(
      'send-email',
      { emailJobId },
      {
        delay,
        jobId: `${emailJobId}-rescheduled-${Date.now()}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    // Do NOT mark as failed — job was rescheduled successfully
    return;
  }

  // --- 3. SEND EMAIL ---
  try {
    await sendEmail({
      to: emailJob.recipientEmail,
      subject: campaign.subject,
      body: campaign.body,
      from: campaign.senderEmail,
    });

    // --- 4. UPDATE STATUS → SENT ---
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: 'sent',
        sentAt: new Date(),
        attempts: { increment: 1 },
        error: null,
      },
    });

    console.log(`✅ EmailJob ${emailJobId} sent to ${emailJob.recipientEmail}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`❌ Failed to send emailJob ${emailJobId}: ${errorMessage}`);
    throw err; // Let BullMQ handle retry
  }
}

export function startWorker(): Worker<EmailJobData> {
  const connection = createRedisConnection();
  const concurrency = parseInt(env.WORKER_CONCURRENCY);

  const worker = new Worker<EmailJobData>('email-queue', processEmailJob, {
    connection,
    concurrency,
  });

  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });

  worker.on('failed', async (job, err) => {
    console.error(`❌ Job ${job?.id} failed: ${err.message}`);

    if (job?.data.emailJobId) {
      // Check if this is the final attempt
      const maxAttempts = job.opts.attempts ?? 3;
      const attemptsMade = job.attemptsMade;

      if (attemptsMade >= maxAttempts) {
        // Mark as permanently failed in DB
        await prisma.emailJob.update({
          where: { id: job.data.emailJobId },
          data: {
            status: 'failed',
            error: err.message,
            attempts: attemptsMade,
          },
        });
        console.error(`💀 EmailJob ${job.data.emailJobId} permanently failed after ${attemptsMade} attempts`);
      }
    }
  });

  worker.on('error', (err) => {
    console.error('🔥 Worker error:', err);
  });

  console.log(`✅ BullMQ worker started (concurrency: ${concurrency})`);

  return worker;
}
