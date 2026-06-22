import "dotenv/config";

import { natsWrapper, sc } from "./natswrapper";
import { handle } from "./handlers";

const SUBJECTS = [
  "auth.otp.requested",
  "auth.worker.registered",
  "auth.recruiter.created",
  "job.status.changed",
  "application.status.changed",
];

const start = async () => {
  if (!process.env.NATS_URL) throw new Error("NATS_URL must be defined");

  await natsWrapper.connect(process.env.NATS_URL);

  for (const subject of SUBJECTS) {
    const sub = natsWrapper.client.subscribe(subject);
    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(sc.decode(msg.data));
          await handle(subject, data);
        } catch (err) {
          console.error(`Error handling ${subject}:`, err);
        }
      }
    })();
  }

  console.log("Notification Service listening for events");
};

start();