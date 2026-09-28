import { NextRequest } from "next/server";

const attempts = new Map<string, { count: number; resetAt: number }>();

export function enforceRateLimit(request: NextRequest, scope: string, limit: number, windowMs: number): boolean {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = `${scope}:${forwarded || request.headers.get("x-real-ip") || "unknown"}`;
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
