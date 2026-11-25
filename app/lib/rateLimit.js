const buckets = new Map();

export function getClientKey(request) {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export function checkRateLimit(key, { limit, windowMs, now = Date.now() } = {}) {
  if (!key || !Number.isInteger(limit) || !Number.isInteger(windowMs)) {
    return { allowed: true, remaining: limit ?? 0, retryAfter: 0 };
  }

  if (buckets.size > 5000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  const bucket = buckets.get(key) ?? { count: 0, resetAt: now + windowMs };
  if (now >= bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }
  bucket.count += 1;
  buckets.set(key, bucket);

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(limit - bucket.count, 0),
    retryAfter: Math.max(Math.ceil((bucket.resetAt - now) / 1000), 1),
  };
}
