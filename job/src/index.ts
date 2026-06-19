import "dotenv/config";

import { app } from "./app";
import { connectDB } from "./config/db";

const start = async () => {
  if (!process.env.JWT_KEY) throw new Error("JWT_KEY must be defined");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be defined");

  await connectDB();

  app.listen(3003, () => {
    console.log("Job Service listening on 3003");
  });
};

start();