// =====================
// Auth
// =====================
export interface User {
  userId: string;
  email: string;
  name: string;
  avatar?: string;
}

// =====================
// Campaigns
// =====================
export interface Campaign {
  id: string;
  subject: string;
  body: string;
  senderEmail: string;
  startTime: string;
  delayBetweenMs: number;
  hourlyLimit: number;
  totalRecipients: number;
  status: 'active' | 'completed';
  createdAt: string;
}

// =====================
// Email Jobs
// =====================
export type JobStatus = 'scheduled' | 'sent' | 'failed';

export interface EmailJob {
  id: string;
  campaignId: string;
  recipientEmail: string;
  subject: string;
  senderEmail: string;
  scheduledFor?: string;
  sentAt?: string;
  status: JobStatus;
  error?: string;
}

// =====================
// API Responses
// =====================
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ScheduleRequest {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string; // ISO string
  delayBetweenMs: number;
  hourlyLimit: number;
}

export interface ScheduleResponse {
  message: string;
  campaign: {
    id: string;
    subject: string;
    totalRecipients: number;
    startTime: string;
    hourlyLimit: number;
    delayBetweenMs: number;
  };
  jobCount: number;
}

export interface CountsResponse {
  scheduled: number;
  sent: number;
}
