import { redis } from '../config/redis';
import { env } from '../config/env';

// Lua script for atomic rate limit check + increment
// Returns 1 if allowed, 0 if denied
const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local expireAt = tonumber(ARGV[2])

local current = tonumber(redis.call('GET', key) or '0')
if current >= limit then
  return 0
end

redis.call('INCR', key)
redis.call('EXPIREAT', key, expireAt)
return 1
`;

/**
 * Returns the start of the current hour (Unix timestamp in seconds)
 */
export function getCurrentHourWindow(): number {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return Math.floor(now.getTime() / 1000);
}

/**
 * Returns the start of the next hour (Unix timestamp in ms)
 */
export function getNextHourStart(): number {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  return now.getTime();
}

/**
 * Returns the end of the current hour (Unix timestamp in seconds)
 */
export function getCurrentHourEnd(): number {
  return getCurrentHourWindow() + 3600;
}

/**
 * Check rate limit for a sender in the current hour window.
 * Atomically increments if allowed.
 * @param senderEmail - the sender's email
 * @param hourlyLimit - maximum emails per hour for this campaign
 * @returns true if send is allowed, false if rate limited
 */
export async function checkAndIncrRateLimit(
  senderEmail: string,
  hourlyLimit: number,
): Promise<boolean> {
  const maxLimit = parseInt(env.MAX_EMAILS_PER_HOUR_PER_SENDER);
  // Use the lower of campaign limit and server max
  const effectiveLimit = Math.min(hourlyLimit, maxLimit);

  const hourWindow = getCurrentHourWindow();
  const key = `ratelimit:${senderEmail}:${hourWindow}`;
  const expireAt = getCurrentHourEnd();

  const result = await redis.eval(
    RATE_LIMIT_SCRIPT,
    1,
    key,
    effectiveLimit.toString(),
    expireAt.toString(),
  );

  return result === 1;
}

/**
 * Get current usage count for a sender in this hour window
 */
export async function getRateLimitCount(senderEmail: string): Promise<number> {
  const hourWindow = getCurrentHourWindow();
  const key = `ratelimit:${senderEmail}:${hourWindow}`;
  const count = await redis.get(key);
  return count ? parseInt(count) : 0;
}
