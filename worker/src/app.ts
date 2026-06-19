import express from "express";
import cookieSession from "cookie-session";
import workerRoutes from "./routes/index";
import { errorHandler } from "./common";

const app = express();

app.set("trust proxy", true);
app.use(express.json());
app.use(cookieSession({ signed: false, secure: false }));

app.use("/api/worker", workerRoutes);

app.use(errorHandler);

export { app };