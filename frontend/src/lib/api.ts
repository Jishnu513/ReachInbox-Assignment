import type {
  PaginatedResponse,
  EmailJob,
  ScheduleRequest,
  ScheduleResponse,
  CountsResponse,
  User,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ri_token');
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// =====================
// Auth
// =====================
export function getGoogleLoginUrl(): string {
  return `${API_URL}/api/auth/google`;
}

export async function getMe(): Promise<{ user: User }> {
  return apiFetch<{ user: User }>('/api/auth/me');
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' });
  localStorage.removeItem('ri_token');
}

// =====================
// Emails
// =====================
export async function scheduleEmails(data: ScheduleRequest): Promise<ScheduleResponse> {
  return apiFetch<ScheduleResponse>('/api/emails/schedule', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getScheduledEmails(
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<EmailJob>> {
  return apiFetch<PaginatedResponse<EmailJob>>(
    `/api/emails/scheduled?page=${page}&limit=${limit}`,
  );
}

export async function getSentEmails(
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<EmailJob>> {
  return apiFetch<PaginatedResponse<EmailJob>>(
    `/api/emails/sent?page=${page}&limit=${limit}`,
  );
}

export async function getEmailCounts(): Promise<CountsResponse> {
  return apiFetch<CountsResponse>('/api/emails/counts');
}
