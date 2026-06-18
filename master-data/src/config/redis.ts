import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL!);

const DEFAULT_TTL = 60 * 60 * 6; // 6 hours

export const getCached = async <T>(key: string): Promise<T | null> => {
  const raw = await redis.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
};

export const setCache = async (key: string, value: unknown, ttl = DEFAULT_TTL) => {
  await redis.set(key, JSON.stringify(value), "EX", ttl);
};

// Deletes every key starting with the given prefix — used to bust
// related cache entries (e.g. "master:locations" + "master:locations:cities")
export const bustPrefix = async (prefix: string) => {
  const stream = redis.scanStream({ match: `${prefix}*` });
  const keysToDelete: string[] = [];
  for await (const keys of stream) {
    keysToDelete.push(...keys);
  }
  if (keysToDelete.length) {
    await redis.del(...keysToDelete);
  }
};