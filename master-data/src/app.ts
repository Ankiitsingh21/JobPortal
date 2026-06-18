import express from "express";
import cookieSession from "cookie-session";
import masterRoutes from "./routes/index";
import { errorHandler } from "./common";

const app = express();

app.set("trust proxy", true);
app.use(express.json());
app.use(cookieSession({ signed: false, secure: false }));

app.use("/api/master", masterRoutes);

app.use(errorHandler);

export { app };