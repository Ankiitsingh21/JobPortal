import express, { Request, Response } from "express";
import { body, query } from "express-validator";
import { requireAuth, requireRole, validateRequest } from "../common";
import * as svc from "../services/worker.service";

const router = express.Router();

router.get("/health", (req: Request, res: Response) => res.send({ date: new Date() }));

// ───────────── Profile (own, worker only) ─────────────
router.post("/profile", requireAuth, requireRole("worker"), async (req: Request, res: Response) => {
  const profile = await svc.createProfile(req.currentUser!.id);
  res.status(201).send({ success: true, data: profile });
});

router.get("/profile", requireAuth, requireRole("worker"), async (req: Request, res: Response) => {
  res.send({ success: true, data: await svc.getOwnProfile(req.currentUser!.id) });
});

router.patch("/profile", requireAuth, requireRole("worker"), async (req: Request, res: Response) => {
  const profile = await svc.updateProfile(req.currentUser!.id, req.body);
  res.send({ success: true, data: profile });
});

// ───────────── Education ─────────────
router.post(
  "/education",
  requireAuth,
  requireRole("worker"),
  [body("qualificationId").isInt().withMessage("qualificationId is required")],
  validateRequest,
  async (req: Request, res: Response) => {
    const { qualificationId, institute, passoutYear, score } = req.body;
    const result = await svc.addEducation(
      req.currentUser!.id,
      qualificationId,
      institute,
      passoutYear,
      score,
    );
    res.status(201).send({ success: true, data: result });
  },
);

router.patch("/education/:id", requireAuth, requireRole("worker"), async (req: Request, res: Response) => {
  res.send({ success: true, data: await svc.updateEducation(req.currentUser!.id, req.params.id as string, req.body) });
});

router.delete("/education/:id", requireAuth, requireRole("worker"), async (req: Request, res: Response) => {
  res.send({ success: true, data: await svc.deleteEducation(req.currentUser!.id, req.params.id as string) });
});

// ───────────── Experience ─────────────
router.post(
  "/experience",
  requireAuth,
  requireRole("worker"),
  [
    body("companyName").notEmpty(),
    body("jobTitle").notEmpty(),
    body("fromDate").notEmpty().withMessage("fromDate is required"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { companyName, jobTitle, fromDate, toDate, isCurrent, description } = req.body;
    const result = await svc.addExperience(
      req.currentUser!.id,
      companyName,
      jobTitle,
      fromDate,
      toDate,
      isCurrent,
      description,
    );
    res.status(201).send({ success: true, data: result });
  },
);

router.patch("/experience/:id", requireAuth, requireRole("worker"), async (req: Request, res: Response) => {
  res.send({ success: true, data: await svc.updateExperience(req.currentUser!.id, req.params.id as string, req.body) });
});

router.delete("/experience/:id", requireAuth, requireRole("worker"), async (req: Request, res: Response) => {
  res.send({ success: true, data: await svc.deleteExperience(req.currentUser!.id, req.params.id as string) });
});

// ───────────── Recruiter/Admin search ─────────────
router.get(
  "/search",
  requireAuth,
  requireRole("recruiter", "super_admin"),
  async (req: Request, res: Response) => {
    const skillId = req.query.skillId ? Number(req.query.skillId) : undefined;
    const city = req.query.city as string | undefined;
    res.send({ success: true, data: await svc.searchWorkers({ skillId, city }) });
  },
);

router.get(
  "/:id",
  requireAuth,
  requireRole("recruiter", "super_admin"),
  async (req: Request, res: Response) => {
    res.send({ success: true, data: await svc.getWorkerById(req.params.id as string) });
  },
);

export default router;  