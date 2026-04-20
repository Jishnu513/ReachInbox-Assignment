import nodemailer from 'nodemailer';
import { env } from './env';

export const transporter = nodemailer.createTransport({
  host: env.ETHEREAL_HOST,
  port: parseInt(env.ETHEREAL_PORT),
  secure: false,
  auth: {
    user: env.ETHEREAL_EMAIL,
    pass: env.ETHEREAL_PASS,
  },
  connectionTimeout: 10000, // fail fast — don't block jobs for 60s
  greetingTimeout: 10000,
  socketTimeout: 10000,
  tls: { rejectUnauthorized: false },
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export async function sendEmail({ to, subject, body, from }: SendEmailOptions): Promise<string> {
  // MOCK MODE: Cloud providers (Railway) block outbound SMTP port 587.
  // When MOCK_EMAIL=true, we simulate delivery — all scheduling, queueing,
  // rate-limiting, and DB persistence still runs correctly end-to-end.
  if (process.env.MOCK_EMAIL === 'true') {
    const mockId = `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await new Promise(res => setTimeout(res, 500)); // realistic 0.5s send delay
    console.log(`📧 [MOCK] Email delivered to ${to} | Subject: "${subject}" | ID: ${mockId}`);
    return mockId;
  }

  // REAL SMTP — used in local dev with Ethereal Email
  const info = await transporter.sendMail({
    from: from ? `"ReachInbox" <${from}>` : `"ReachInbox" <${env.ETHEREAL_EMAIL}>`,
    to,
    subject,
    html: body,
    text: body.replace(/<[^>]*>/g, ''),
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log(`📧 Email sent to ${to} | Preview: ${previewUrl}`);
  return info.messageId;
}

// Verify SMTP connection on startup (non-fatal)
export async function verifyMailer(): Promise<void> {
  if (process.env.MOCK_EMAIL === 'true') {
    console.log('📧 Mailer: MOCK mode active (SMTP bypassed for cloud env)');
    return;
  }
  try {
    await transporter.verify();
    console.log('✅ Ethereal SMTP connected');
  } catch (err) {
    console.error('❌ Ethereal SMTP error:', err);
  }
}
