import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import passport from 'passport';
import { env } from './config/env';
import { verifyMailer } from './config/mailer';
import { startWorker } from './queues/emailWorker';
import authRoutes from './routes/auth';
import emailRoutes from './routes/emails';
import { errorHandler } from './middleware/errorHandler';
import { redis } from './config/redis';
import { prisma } from './config/database';

const app = express();

// CORS — allow frontend with credentials
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Passport init (no session — we use JWT)
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redisPing = await redis.ping();
    res.json({
      status: 'ok',
      database: 'connected',
      redis: redisPing === 'PONG' ? 'connected' : 'error',
      worker: 'running',
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: String(err) });
  }
});

// Global error handler
app.use(errorHandler);

async function bootstrap() {
  try {
    // Test DB connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Verify SMTP
    await verifyMailer();

    // Start BullMQ worker
    startWorker();

    const PORT = parseInt(env.PORT);
    app.listen(PORT, () => {
      console.log(`\n🚀 ReachInbox backend running on http://localhost:${PORT}`);
      console.log(`   Environment: ${env.NODE_ENV}`);
      console.log(`   Frontend URL: ${env.FRONTEND_URL}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
