import express, { Request, Response } from "express";
import { body } from "express-validator";
import { requireAuth, requireRole, validateRequest } from "../common";
import { categoryGuard } from "../middlewares/category-guard";
import * as svc from "../services/job.service";

const router = express.Router();

router.get("/health", (req: Request, res: Response) => res.send({ date: new Date() }));

// ───────────── Create job (recruiter or super_admin, category-guarded) ─────────────
router.post(
  "/",
  requireAuth,
  requireRole("recruiter", "super_admin"),
  [
    body("title").notEmpty(),
    body("industryId").isInt(),
    body("locationId").isInt(),
    body("headcountRequired").isInt({ min: 1 }),
  ],
  validateRequest,
  categoryGuard,
  async (req: Request, res: Response) => {
    const job = await svc.createJob(req.currentUser!.id, req.body);
    res.status(201).send({ success: true, data: job });
  },
);

// ───────────── List (role-aware) ─────────────
router.get(
  "/",
  requireAuth,
  requireRole("worker", "recruiter", "super_admin"),
  async (req: Request, res: Response) => {
    const jobs = await svc.listJobs(req.currentUser!.role, req.currentUser!.id);
    res.send({ success: true, data: jobs });
  },
);

// ───────────── Single job ─────────────
router.get(
  "/:id",
  requireAuth,
  requireRole("worker", "recruiter", "super_admin"),
  async (req: Request, res: Response) => {
    res.send({ success: true, data: await svc.getJob(req.params.id as string) });
  },
);

// ───────────── Edit (owner recruiter or admin) ─────────────
router.patch(
  "/:id",
  requireAuth,
  requireRole("recruiter", "super_admin"),
  async (req: Request, res: Response) => {
    const job = await svc.updateJob(req.params.id as string, req.currentUser!, req.body);
    res.send({ success: true, data: job });
  },
);

// ───────────── Status transitions ─────────────
router.patch(
  "/:id/status",
  requireAuth,
  requireRole("recruiter", "super_admin"),
  [body("status").isIn(["draft", "active", "closed"])],
  validateRequest,
  async (req: Request, res: Response) => {
    const job = await svc.updateJobStatus(req.params.id as string, req.currentUser!, req.body.status);
    res.send({ success: true, data: job });
  },
);

// ───────────── Delete (draft only) ─────────────
router.delete(
  "/:id",
  requireAuth,
  requireRole("recruiter", "super_admin"),
  async (req: Request, res: Response) => {
    res.send({ success: true, data: await svc.deleteJob(req.params.id as string, req.currentUser!) });
  },
);

// ───────────── Admin reassigns job to a different recruiter ─────────────
router.patch(
  "/:id/assign",
  requireAuth,
  requireRole("super_admin"),
  [body("recruiterUserId").notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    const job = await svc.assignJobToRecruiter(req.params.id as string, req.body.recruiterUserId);
    res.send({ success: true, data: job });
  },
);

// ───────────── Internal: Admin Service reports will call this later ─────────────
router.get("/internal/by-recruiter/:userId", async (req: Request, res: Response) => {
  const jobs = await svc.listJobsByRecruiter(req.params.userId as string);
  res.send({ success: true, data: jobs });
});


router.get("/internal/:id", async (req: Request, res: Response) => {
  res.send({ success: true, data: await svc.getJob(req.params.id as string) });
});

export default router;