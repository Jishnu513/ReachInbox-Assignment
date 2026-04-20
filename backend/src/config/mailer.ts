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
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export async function sendEmail({ to, subject, body, from }: SendEmailOptions): Promise<string> {
  const info = await transporter.sendMail({
    from: from ? `"ReachInbox" <${from}>` : `"ReachInbox" <${env.ETHEREAL_EMAIL}>`,
    to,
    subject,
    html: body,
    text: body.replace(/<[^>]*>/g, ''), // strip HTML for plain text fallback
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log(`📧 Email sent to ${to} | Preview: ${previewUrl}`);
  return info.messageId;
}

// Verify SMTP connection on startup
export async function verifyMailer(): Promise<void> {
  try {
    await transporter.verify();
    console.log('✅ Ethereal SMTP connected');
  } catch (err) {
    console.error('❌ Ethereal SMTP error:', err);
  }
}
