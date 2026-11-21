import { ApiError } from "./api";

const attempts = new Map<string, { count: number; resetAt: number }>();

export function enforceRateLimit(userId: string, scope: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  const key = `${scope}:${userId}`;
  for (const [storedKey, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(storedKey);
  }
  const current = attempts.get(key);
  if (!current) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= limit) throw new ApiError(429, "Too many requests. Try again in a minute.");
  current.count++;
}
