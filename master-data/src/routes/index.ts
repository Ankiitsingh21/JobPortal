import express, { Request, Response } from "express";
import { body, param, query } from "express-validator";
import { requireAuth, requireRole, validateRequest } from "../common";
import * as svc from "../services/master-data.service";
import jwt from "jsonwebtoken";

const router = express.Router();

router.get("/health", (req: Request, res: Response) => res.send({ date: new Date() }));

router.get("/test-login", (req, res) => {
  req.session = {
    jwt: jwt.sign(
      {
        id: "test-admin",
        role: "super_admin",
      },
      process.env.JWT_KEY!
    ),
  };

  res.send({ success: true });
});

// ───────────── Locations ─────────────
router.get("/locations", requireAuth, async (req, res) => {
  res.send({ success: true, data: await svc.listLocations() });
});

router.get("/locations/cities", requireAuth, async (req, res) => {
  res.send({ success: true, data: await svc.listCities() });
});

router.get("/locations/:city/localities", requireAuth, async (req, res) => {
  res.send({ success: true, data: await svc.listLocalitiesByCity(req.params.city as string ) });
});

router.post(
  "/locations",
  requireAuth,
  requireRole("super_admin"),
  [body("state").notEmpty(), body("city").notEmpty(), body("locality").notEmpty()],
  validateRequest,
  async (req:Request, res:Response) => {
    const { state, city, locality } = req.body;
    res.status(201).send({ success: true, data: await svc.createLocation(state, city, locality) });
  },
);

router.patch("/locations/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
  res.send({ success: true, data: await svc.updateLocation(Number(req.params.id), req.body) });
});

router.delete("/locations/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
  res.send({ success: true, data: await svc.deleteLocation(Number(req.params.id)) });
});

// ───────────── Simple resources: industries, functions, skills, languages ─────────────
const simpleResources: [string, typeof svc.industries][] = [
  ["industries", svc.industries],
  ["functions", svc.functions],
  ["skills", svc.skills],
  ["languages", svc.languages],
];

for (const [path, resource] of simpleResources) {
  router.get(`/${path}`, requireAuth, async (req, res) => {
    res.send({ success: true, data: await resource.list() });
  });

  router.post(
    `/${path}`,
    requireAuth,
    requireRole("super_admin"),
    [body("name").notEmpty()],
    validateRequest,
    async (req:Request, res:Response) => {
      res.status(201).send({ success: true, data: await resource.create(req.body.name) });
    },
  );

  router.patch(`/${path}/:id`, requireAuth, requireRole("super_admin"), async (req, res) => {
    res.send({ success: true, data: await resource.update(Number(req.params.id), req.body) });
  });

  router.delete(`/${path}/:id`, requireAuth, requireRole("super_admin"), async (req, res) => {
    res.send({ success: true, data: await resource.remove(Number(req.params.id)) });
  });
}

// ───────────── Job roles ─────────────
router.get("/job-roles", requireAuth, async (req, res) => {
  const functionId = req.query.function_id ? Number(req.query.function_id) : undefined;
  res.send({ success: true, data: await svc.listJobRoles(functionId) });
});

router.post(
  "/job-roles",
  requireAuth,
  requireRole("super_admin"),
  [body("name").notEmpty()],
  validateRequest,
  async (req:Request, res:Response) => {
    res.status(201).send({ success: true, data: await svc.createJobRole(req.body.name, req.body.functionId) });
  },
);

router.patch("/job-roles/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
  res.send({ success: true, data: await svc.updateJobRole(Number(req.params.id), req.body) });
});

router.delete("/job-roles/:id", requireAuth, requireRole("super_admin"), async (req, res) => {
  res.send({ success: true, data: await svc.deleteJobRole(Number(req.params.id)) });
});

// ───────────── Qualifications ─────────────
router.get("/qualifications", requireAuth, async (req, res) => {
  res.send({ success: true, data: await svc.listQualifications() });
});

router.post(
  "/qualifications",
  requireAuth,
  requireRole("super_admin"),
  [body("name").notEmpty(), body("level").notEmpty()],
  validateRequest,
  async (req:Request, res:Response) => {
    res.status(201).send({ success: true, data: await svc.createQualification(req.body.name, req.body.level) });
  },
);

export default router;