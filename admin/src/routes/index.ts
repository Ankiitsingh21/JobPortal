import express, { Request, Response } from "express";
import { body } from "express-validator";
import { requireAuth, requireInternalKey, requireRole, validateRequest } from "../common";
import * as svc from "../services/admin.service";

const router = express.Router();

router.get("/health", (req: Request, res: Response) => res.send({ date: new Date() }));

// ───────────── Recruiter management (super_admin only) ─────────────
router.post(
  "/recruiters",
  requireAuth,
  requireRole("super_admin"),
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be 6+ chars"),
    body("industryIds").isArray({ min: 1 }).withMessage("At least one category is required"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { name, email, password, industryIds } = req.body;
    const recruiter = await svc.createRecruiter(
      name,
      email,
      password,
      req.currentUser!.id,
      industryIds,
    );
    res.status(201).send({ success: true, data: recruiter });
  },
);

router.get("/recruiters", requireAuth, requireRole("super_admin"), async (req: Request, res: Response) => {
  res.send({ success: true, data: await svc.listRecruiters() });
});

router.get("/recruiters/:id", requireAuth, requireRole("super_admin"), async (req: Request, res: Response) => {
  res.send({ success: true, data: await svc.getRecruiter(req.params.id as string) });
});

router.patch("/recruiters/:id", requireAuth, requireRole("super_admin"), async (req: Request, res: Response) => {
  res.send({ success: true, data: await svc.updateRecruiter(req.params.id as string, req.body) });
});

router.patch(
  "/recruiters/:id/categories",
  requireAuth,
  requireRole("super_admin"),
  [body("industryIds").isArray({ min: 1 }).withMessage("At least one category is required")],
  validateRequest,
  async (req: Request, res: Response) => {
    const data = await svc.replaceCategories(req.params.id as string, req.body.industryIds);
    res.send({ success: true, data });
  },
);

router.patch(
  "/recruiters/:id/deactivate",
  requireAuth,
  requireRole("super_admin"),
  async (req: Request, res: Response) => {
    res.send({ success: true, data: await svc.setRecruiterActive(req.params.id as string, false) });
  },
);

router.patch(
  "/recruiters/:id/reactivate",
  requireAuth,
  requireRole("super_admin"),
  async (req: Request, res: Response) => {
    res.send({ success: true, data: await svc.setRecruiterActive(req.params.id as string, true) });
  },
);


router.get("/internal/recruiter-categories/:userId", requireInternalKey, async (req: Request, res: Response) => {
  const industryIds = await svc.getRecruiterCategoryIds(req.params.userId as string);
  res.send({ success: true, data: { industryIds } });
});

export default router;