import axios from "axios";
import { prisma } from "../config/db";
import { BadRequestError, NotFoundError } from "../common";

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL!;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY!;

// ───────────── Create recruiter ─────────────
// Step 1: ask Auth Service to create the login (email+password+role)
// Step 2: store the recruiter profile locally, linked via userId (soft ref)
// Step 3: assign initial categories
export const createRecruiter = async (
  name: string,
  email: string,
  password: string,
  createdBy: string,
  industryIds: number[],
) => {
  let authUser;
  try {
    const response = await axios.post(
      `${AUTH_SERVICE_URL}/api/auth/internal/create-user`,
      { email, password, role: "recruiter" },
      { headers: { "x-internal-key": INTERNAL_API_KEY } },
    );
    authUser = response.data.data;
  } catch (err: any) {
    const message = err.response?.data?.message ?? "Failed to create login for recruiter";
    throw new BadRequestError(message);
  }

  const recruiter = await prisma.recruiter.create({
    data: {
      userId: authUser.id,
      name,
      email,
      createdBy,
      categories: {
        create: industryIds.map((industryId) => ({ industryId })),
      },
    },
    include: { categories: true },
  });

  return recruiter;
};

// ───────────── List / get ─────────────
export const listRecruiters = async () => {
  return prisma.recruiter.findMany({
    include: { categories: true },
    orderBy: { createdAt: "desc" },
  });
};

export const getRecruiter = async (id: string) => {
  const recruiter = await prisma.recruiter.findUnique({
    where: { id },
    include: { categories: true },
  });
  if (!recruiter) throw new NotFoundError("Recruiter not found");
  return recruiter;
};

// ───────────── Update basic info ─────────────
export const updateRecruiter = async (
  id: string,
  data: Partial<{ name: string; email: string }>,
) => {
  const recruiter = await prisma.recruiter.update({ where: { id }, data });
  return recruiter;
};

// ───────────── Full replace categories ─────────────
export const replaceCategories = async (recruiterId: string, industryIds: number[]) => {
  const recruiter = await prisma.recruiter.findUnique({ where: { id: recruiterId } });
  if (!recruiter) throw new NotFoundError("Recruiter not found");

  await prisma.$transaction([
    prisma.recruiterCategory.deleteMany({ where: { recruiterId } }),
    prisma.recruiterCategory.createMany({
      data: industryIds.map((industryId) => ({ recruiterId, industryId })),
    }),
  ]);

  return getRecruiter(recruiterId);
};

// ───────────── Activate / deactivate ─────────────
export const setRecruiterActive = async (id: string, isActive: boolean) => {
  const recruiter = await prisma.recruiter.update({ where: { id }, data: { isActive } });
  return recruiter;
};


// ───────────── Internal: called by Auth Service at login time ─────────────
export const getRecruiterCategoryIds = async (userId: string) => {
  const recruiter = await prisma.recruiter.findUnique({
    where: { userId },
    include: { categories: true },
  });
  if (!recruiter) return [];
  return recruiter.categories.map((c) => c.industryId);
};