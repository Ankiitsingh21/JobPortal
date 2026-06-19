import express, { Request, Response } from "express";
import { body } from "express-validator";
import { requireAuth, requireInternalKey, validateRequest } from "../common";
import * as svc from "../services/auth.service";

const router = express.Router();

router.get("/health", (req: Request, res: Response) => res.send({ date: new Date() }));

// ───────────── Worker registration + OTP ─────────────
router.post(
  "/worker/register",
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").trim().isLength({ min: 6 }).withMessage("Password must be 6+ chars"),
    body("phone").trim().isLength({ min: 10, max: 15 }).withMessage("Valid phone required"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { email, password, phone } = req.body;
    const result = await svc.registerWorker(email, password, phone);
    res.status(201).send({ success: true, data: result, message: "OTP sent" });
  },
);

router.post(
  "/worker/verify-otp",
  [body("phone").notEmpty(), body("otp").notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    const { phone, otp } = req.body;
    const result = await svc.verifyWorkerOtp(phone, otp);
    req.session = { jwt: result.token };
    res.send({ success: true, data: result });
  },
);

router.post(
  "/worker/resend-otp",
  [body("phone").notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    const result = await svc.resendWorkerOtp(req.body.phone);
    res.send({ success: true, data: result, message: "OTP resent" });
  },
);

// ───────────── Login (worker / recruiter / super_admin) ─────────────
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await svc.login(email, password);
    req.session = { jwt: result.token };
    res.send({ success: true, data: result });
  },
);

router.post("/logout", (req: Request, res: Response) => {
  req.session = null;
  res.send({ success: true });
});

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const user = await svc.getCurrentUser(req.currentUser!.id);
  if (!user) {
    req.session = null;
    return res.send({ success: true, data: null });
  }
  res.send({ success: true, data: user });
});

// ───────────── Internal: Admin Service will call this later ─────────────
router.post(
  "/internal/create-user",
  requireInternalKey,
  [
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    body("role").isIn(["recruiter", "super_admin"]),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { email, password, role } = req.body;
    const user = await svc.internalCreateUser(email, password, role);
    res.status(201).send({ success: true, data: user });
  },
);

export default router;