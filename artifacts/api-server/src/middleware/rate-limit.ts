import type { NextFunction, Request, Response } from "express";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
};

type Bucket = {
  resetAt: number;
  count: number;
};

const buckets = new Map<string, Bucket>();

function clientKey(req: Request, prefix: string) {
  const userId = req.currentUser?.id ? `user:${req.currentUser.id}` : `ip:${req.ip}`;
  return `${prefix}:${userId}`;
}

export function createRateLimit({ windowMs, max, keyPrefix }: RateLimitOptions) {
  return function rateLimit(req: Request, res: Response, next: NextFunction) {
    const now = Date.now();
    const key = clientKey(req, keyPrefix);
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ error: "Terlalu banyak request. Coba lagi nanti." });
    }

    return next();
  };
}
