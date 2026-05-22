import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('4000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://reachinbox:reachinbox@localhost:5432/reachinbox'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  GOOGLE_CLIENT_ID: z.string().default('mock_google_client_id'),
  GOOGLE_CLIENT_SECRET: z.string().default('mock_google_client_secret'),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:4000/api/auth/google/callback'),
  JWT_SECRET: z.string().default('mock_jwt_secret_value_for_development_purposes_only'),
  ETHEREAL_EMAIL: z.string().default('mock@ethereal.email'),
  ETHEREAL_PASS: z.string().default('mockpassword'),
  ETHEREAL_HOST: z.string().default('smtp.ethereal.email'),
  ETHEREAL_PORT: z.string().default('587'),
  WORKER_CONCURRENCY: z.string().default('5'),
  MAX_EMAILS_PER_HOUR_PER_SENDER: z.string().default('100'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
