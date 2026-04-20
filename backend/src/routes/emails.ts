import express, { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { requireAuth } from '../middleware/requireAuth';
import { scheduleEmails, ScheduleEmailSchema } from '../services/schedulerService';

const router: Router = express.Router();

// All routes require authentication
router.use(requireAuth);

// POST /api/emails/schedule — Create a new email campaign
router.post('/schedule', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ScheduleEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const user = req.user!;
    const result = await scheduleEmails(user.userId, user.email, parsed.data);

    res.status(201).json({
      message: 'Campaign scheduled successfully',
      campaign: {
        id: result.campaign.id,
        subject: result.campaign.subject,
        totalRecipients: result.campaign.totalRecipients,
        startTime: result.campaign.startTime,
        hourlyLimit: result.campaign.hourlyLimit,
        delayBetweenMs: result.campaign.delayBetweenMs,
      },
      jobCount: result.jobCount,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/emails/scheduled — List scheduled (pending) emails for current user
router.get('/scheduled', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt((req.query.page as string) ?? '1');
    const limit = parseInt((req.query.limit as string) ?? '20');
    const skip = (page - 1) * limit;

    const user = req.user!;

    const [jobs, total] = await Promise.all([
      prisma.emailJob.findMany({
        where: {
          status: 'scheduled',
          campaign: { userId: user.userId },
        },
        include: {
          campaign: {
            select: { subject: true, senderEmail: true },
          },
        },
        orderBy: { scheduledFor: 'asc' },
        skip,
        take: limit,
      }),
      prisma.emailJob.count({
        where: {
          status: 'scheduled',
          campaign: { userId: user.userId },
        },
      }),
    ]);

    res.json({
      data: jobs.map((j) => ({
        id: j.id,
        recipientEmail: j.recipientEmail,
        subject: j.campaign.subject,
        senderEmail: j.campaign.senderEmail,
        scheduledFor: j.scheduledFor,
        status: j.status,
        campaignId: j.campaignId,
      })),
      total,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/emails/sent — List sent + failed emails for current user
router.get('/sent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt((req.query.page as string) ?? '1');
    const limit = parseInt((req.query.limit as string) ?? '20');
    const skip = (page - 1) * limit;

    const user = req.user!;

    const [jobs, total] = await Promise.all([
      prisma.emailJob.findMany({
        where: {
          status: { in: ['sent', 'failed'] },
          campaign: { userId: user.userId },
        },
        include: {
          campaign: {
            select: { subject: true, senderEmail: true },
          },
        },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.emailJob.count({
        where: {
          status: { in: ['sent', 'failed'] },
          campaign: { userId: user.userId },
        },
      }),
    ]);

    res.json({
      data: jobs.map((j) => ({
        id: j.id,
        recipientEmail: j.recipientEmail,
        subject: j.campaign.subject,
        senderEmail: j.campaign.senderEmail,
        sentAt: j.sentAt,
        status: j.status,
        error: j.error,
        campaignId: j.campaignId,
      })),
      total,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/emails/counts — Get counts for sidebar badges
router.get('/counts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    const [scheduledCount, sentCount] = await Promise.all([
      prisma.emailJob.count({
        where: { status: 'scheduled', campaign: { userId: user.userId } },
      }),
      prisma.emailJob.count({
        where: { status: { in: ['sent', 'failed'] }, campaign: { userId: user.userId } },
      }),
    ]);

    res.json({ scheduled: scheduledCount, sent: sentCount });
  } catch (err) {
    next(err);
  }
});

export default router;
