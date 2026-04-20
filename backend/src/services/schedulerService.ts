import { prisma } from '../config/database';
import { emailQueue } from '../queues/emailQueue';
import { env } from '../config/env';
import { z } from 'zod';

export const ScheduleEmailSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  recipients: z.array(z.string().email()).min(1, 'At least one recipient is required'),
  startTime: z.string().datetime(),
  delayBetweenMs: z.number().int().min(0).default(2000),
  hourlyLimit: z.number().int().min(1).max(10000),
});

export type ScheduleEmailInput = z.infer<typeof ScheduleEmailSchema>;

export async function scheduleEmails(
  userId: string,
  senderEmail: string,
  input: ScheduleEmailInput,
) {
  const { subject, body, recipients, startTime, delayBetweenMs, hourlyLimit } = input;

  const serverMax = parseInt(env.MAX_EMAILS_PER_HOUR_PER_SENDER);
  const effectiveHourlyLimit = Math.min(hourlyLimit, serverMax);

  const startTimestamp = new Date(startTime).getTime();

  // Create campaign in DB
  const campaign = await prisma.emailCampaign.create({
    data: {
      userId,
      subject,
      body,
      senderEmail,
      startTime: new Date(startTime),
      delayBetweenMs,
      hourlyLimit: effectiveHourlyLimit,
      totalRecipients: recipients.length,
      status: 'active',
    },
  });

  const jobs: Array<{ id: string; recipientEmail: string; scheduledFor: Date }> = [];

  // Create each email_job and enqueue BullMQ delayed job
  for (let i = 0; i < recipients.length; i++) {
    const scheduledFor = new Date(startTimestamp + i * delayBetweenMs);
    const delay = Math.max(0, scheduledFor.getTime() - Date.now());

    // Create DB record first
    const emailJob = await prisma.emailJob.create({
      data: {
        campaignId: campaign.id,
        recipientEmail: recipients[i],
        scheduledFor,
        status: 'scheduled',
      },
    });

    // Enqueue BullMQ with the emailJob.id as the unique BullMQ job id
    await emailQueue.add(
      'send-email',
      { emailJobId: emailJob.id },
      {
        delay,
        jobId: emailJob.id, // deduplicate by emailJobId
      },
    );

    // Store BullMQ job ID back in DB
    await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: { bullmqJobId: emailJob.id },
    });

    jobs.push({ id: emailJob.id, recipientEmail: recipients[i], scheduledFor });
  }

  console.log(
    `✅ Campaign ${campaign.id} created: ${recipients.length} emails scheduled starting ${startTime}`,
  );

  return { campaign, jobCount: jobs.length };
}
