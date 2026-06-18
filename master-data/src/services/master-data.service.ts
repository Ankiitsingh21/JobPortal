import { prisma } from "../config/db";
import { getCached, setCache, bustPrefix } from "../config/redis";
import { BadRequestError } from "../common";

// ───────────── Locations ─────────────
export const listLocations = async () => {
  const cached = await getCached("master:locations");
  if (cached) return cached;
  const data = await prisma.location.findMany({ where: { isActive: true } });
  await setCache("master:locations", data);
  return data;
};

export const listCities = async () => {
  const cached = await getCached("master:locations:cities");
  if (cached) return cached;
  const rows = await prisma.location.findMany({
    where: { isActive: true },
    select: { city: true },
    distinct: ["city"],
  });
  const cities = rows.map((r) => r.city);
  await setCache("master:locations:cities", cities);
  return cities;
};

export const listLocalitiesByCity = async (city: string) => {
  const key = `master:locations:city:${city}`;
  const cached = await getCached(key);
  if (cached) return cached;
  const data = await prisma.location.findMany({
    where: { city, isActive: true },
  });
  await setCache(key, data);
  return data;
};

export const createLocation = async (
  state: string,
  city: string,
  locality: string,
) => {
  const loc = await prisma.location.create({ data: { state, city, locality } });
  await bustPrefix("master:locations");
  return loc;
};

export const updateLocation = async (
  id: number,
  data: Partial<{
    state: string;
    city: string;
    locality: string;
    isActive: boolean;
  }>,
) => {
  const loc = await prisma.location.update({ where: { id }, data });
  await bustPrefix("master:locations");
  return loc;
};

export const deleteLocation = async (id: number) => {
  const loc = await prisma.location.update({
    where: { id },
    data: { isActive: false },
  });
  await bustPrefix("master:locations");
  return loc;
};

// ───────────── Generic factory for simple lookup tables ─────────────
// Industries, Functions, Skills, Languages all share the same shape:
// { id, name, isActive } — so one factory builds CRUD for all of them.

function buildSimpleResource(
  modelName: "industry" | "jobFunction" | "skill" | "language",
  cacheKey: string,
) {
  const model = (prisma as any)[modelName];

  return {
    list: async () => {
      const cached = await getCached(cacheKey);
      if (cached) return cached;
      const data = await model.findMany({ where: { isActive: true } });
      await setCache(cacheKey, data);
      return data;
    },
    create: async (name: string) => {
      const existing = await model.findUnique({ where: { name } });
      if (existing) throw new BadRequestError(`${name} already exists`);
      const item = await model.create({ data: { name } });
      await bustPrefix(cacheKey);
      return item;
    },
    update: async (
      id: number,
      data: Partial<{ name: string; isActive: boolean }>,
    ) => {
      const item = await model.update({ where: { id }, data });
      await bustPrefix(cacheKey);
      return item;
    },
    remove: async (id: number) => {
      const item = await model.update({
        where: { id },
        data: { isActive: false },
      });
      await bustPrefix(cacheKey);
      return item;
    },
  };
}

export const industries = buildSimpleResource("industry", "master:industries");
export const functions = buildSimpleResource("jobFunction", "master:functions");
export const skills = buildSimpleResource("skill", "master:skills");
export const languages = buildSimpleResource("language", "master:languages");

// ───────────── Job roles (has functionId) ─────────────
export const listJobRoles = async (functionId?: number) => {
  const key = functionId
    ? `master:job_roles:fn:${functionId}`
    : "master:job_roles:all";
  const cached = await getCached(key);
  if (cached) return cached;
  const data = await prisma.jobRole.findMany({
    where: { isActive: true, ...(functionId ? { functionId } : {}) },
  });
  await setCache(key, data);
  return data;
};

export const createJobRole = async (name: string, functionId?: number) => {
  const role = await prisma.jobRole.create({ data: { name, functionId } });
  await bustPrefix("master:job_roles");
  return role;
};

export const updateJobRole = async (
  id: number,
  data: Partial<{ name: string; functionId: number; isActive: boolean }>,
) => {
  const role = await prisma.jobRole.update({ where: { id }, data });
  await bustPrefix("master:job_roles");
  return role;
};

export const deleteJobRole = async (id: number) => {
  const role = await prisma.jobRole.update({
    where: { id },
    data: { isActive: false },
  });
  await bustPrefix("master:job_roles");
  return role;
};

// ───────────── Qualifications (has level) ─────────────
export const listQualifications = async () => {
  const cached = await getCached("master:qualifications");
  if (cached) return cached;
  const data = await prisma.qualification.findMany({
    where: { isActive: true },
  });
  await setCache("master:qualifications", data);
  return data;
};

export const createQualification = async (name: string, level: string) => {
  const q = await prisma.qualification.create({ data: { name, level } });
  await bustPrefix("master:qualifications");
  return q;
};
