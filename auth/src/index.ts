import "dotenv/config";

import { app } from "./app";
import { connectDB } from "./config/db";
import { redis } from "./config/redis";

const start = async () => {
  if (!process.env.JWT_KEY) throw new Error("JWT_KEY must be defined");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be defined");
  if (!process.env.REDIS_URL) throw new Error("REDIS_URL must be defined");
  if (!process.env.INTERNAL_API_KEY) throw new Error("INTERNAL_API_KEY must be defined");

  await connectDB();
  await redis.ping();
  console.log("Redis connected");

  app.listen(3000, () => {
    console.log("Auth Service listening on 3000");
  });
};

start();