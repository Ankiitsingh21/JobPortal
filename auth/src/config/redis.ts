import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL!);

const OTP_TTL_SECONDS = 300; // 5 minutes

export const storeOtp = async (phone: string, otp: string) => {
  await redis.set(`otp:${phone}`, otp, "EX", OTP_TTL_SECONDS);
};

export const getOtp = async (phone: string) => {
  return redis.get(`otp:${phone}`);
};

export const clearOtp = async (phone: string) => {
  await redis.del(`otp:${phone}`);
};