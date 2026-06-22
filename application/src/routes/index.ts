import express, { Request, Response } from "express";
import { body } from "express-validator";
import { requireAuth, requireRole, validateRequest } from "../common";
import * as svc from "../services/application.service";

const router = express.Router();

router.get("/health", (req: Request, res: Response) => res.send({ date: new Date() }));

router.post(
  "/",
  requireAuth,
  requireRole("worker"),
  [body("jobId").notEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    const app = await svc.applyToJob(req.currentUser!.id, req.body.jobId, req.body.coverNote);
    res.status(201).send({ success: true, data: app });
  },
);

router.get("/my", requireAuth, requireRole("worker"), async (req: Request, res: Response) => {
  res.send({ success: true, data: await svc.listMyApplications(req.currentUser!.id) });
});

router.get(
  "/job/:jobId",
  requireAuth,
  requireRole("recruiter", "super_admin"),
  async (req: Request, res: Response) => {
    res.send({ success: true, data: await svc.listApplicationsForJob(req.params.jobId as string, req.currentUser!) });
  },
);

router.get(
  "/:id",
  requireAuth,
  requireRole("worker", "recruiter", "super_admin"),
  async (req: Request, res: Response) => {
    res.send({ success: true, data: await svc.getApplication(req.params.id as string, req.currentUser!) });
  },
);

router.patch(
  "/:id/status",
  requireAuth,
  requireRole("recruiter", "super_admin"),
  [body("status").isIn(["shortlisted", "interview_scheduled", "hired", "rejected"])],
  validateRequest,
  async (req: Request, res: Response) => {
    const app = await svc.updateStatus(req.params.id as string, req.currentUser!, req.body.status, req.body.notes);
    res.send({ success: true, data: app });
  },
);

router.delete("/:id", requireAuth, requireRole("worker"), async (req: Request, res: Response) => {
  res.send({ success: true, data: await svc.withdrawApplication(req.params.id as string, req.currentUser!.id) });
});

// ───────────── Internal: Admin Service reports ─────────────
router.post("/internal/by-jobs", async (req: Request, res: Response) => {
  res.send({ success: true, data: await svc.listByJobIds(req.body.jobIds) });
});

router.get("/internal/by-recruiter/:recruiterId", async (req: Request, res: Response) => {
  res.send({ success: true, data: await svc.listByRecruiter(req.params.recruiterId as string) });
});

export default router;