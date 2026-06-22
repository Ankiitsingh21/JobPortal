import "dotenv/config";

import { app } from "./app";
import { connectDB } from "./config/db";
import { natsWrapper } from "./natswrapper";

const start = async () => {
  if (!process.env.JWT_KEY) throw new Error("JWT_KEY must be defined");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be defined");
  if (!process.env.JOB_SERVICE_URL) throw new Error("JOB_SERVICE_URL must be defined");
  if (!process.env.NATS_URL) throw new Error("NATS_URL must be defined");

  await connectDB();
  await natsWrapper.connect(process.env.NATS_URL);

  app.listen(3004, () => {
    console.log("Application Service listening on 3004");
  });
};

start();