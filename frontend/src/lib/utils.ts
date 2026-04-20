import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    return format(parseISO(dateString), 'MMM d, yyyy h:mm a');
  } catch {
    return '—';
  }
}

export function formatRelative(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
  } catch {
    return '—';
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function parseEmailsFromText(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex) ?? [];
  // Deduplicate
  return Array.from(new Set(matches));
}
