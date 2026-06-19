import "dotenv/config";

import { app } from "./app";
import { connectDB } from "./config/db";

const start = async () => {
  if (!process.env.JWT_KEY) throw new Error("JWT_KEY must be defined");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be defined");
  if (!process.env.AUTH_SERVICE_URL) throw new Error("AUTH_SERVICE_URL must be defined");
  if (!process.env.INTERNAL_API_KEY) throw new Error("INTERNAL_API_KEY must be defined");

  await connectDB();

  app.listen(3001, () => {
    console.log("Admin Service listening on 3001");
  });
};

start();