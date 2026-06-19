import { prisma } from "../config/db";
import { BadRequestError, NotFoundError } from "../common";

// ───────────── Profile ─────────────
export const createProfile = async (userId: string) => {
  const existing = await prisma.workerProfile.findUnique({ where: { userId } });
  if (existing) throw new BadRequestError("Profile already exists");

  return prisma.workerProfile.create({ data: { userId } });
};

export const getOwnProfile = async (userId: string) => {
  const profile = await prisma.workerProfile.findUnique({
    where: { userId },
    include: { education: true, experience: true },
  });
  if (!profile) throw new NotFoundError("Profile not found — create it first");
  return profile;
};

const PROFILE_FIELDS = [
  "name", "phone", "dob", "gender", "city", "currentLocality",
  "profilePhotoUrl", "headline", "summary", "totalExperienceMonths",
  "expectedSalaryMin", "expectedSalaryMax", "jobType", "availability",
  "resumeUrl", "skillIds", "languageIds", "preferredLocationIds",
  "preferredIndustryIds",
];

export const updateProfile = async (userId: string, body: Record<string, any>) => {
  const profile = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError("Profile not found — create it first");

  // Only allow whitelisted fields through — prevents arbitrary field injection
  const data: Record<string, any> = {};
  for (const key of PROFILE_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  if (data.dob) data.dob = new Date(data.dob);

  const updated = await prisma.workerProfile.update({ where: { userId }, data });

  // Auto-flag profile as complete once the essentials are filled in
  const isComplete = !!(updated.name && updated.phone && updated.resumeUrl && updated.skillIds.length);
  if (isComplete !== updated.profileComplete) {
    return prisma.workerProfile.update({
      where: { userId },
      data: { profileComplete: isComplete },
    });
  }

  return updated;
};

// ───────────── Education ─────────────
export const addEducation = async (
  userId: string,
  qualificationId: number,
  institute?: string,
  passoutYear?: number,
  score?: string,
) => {
  const profile = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError("Profile not found — create it first");

  return prisma.workerEducation.create({
    data: { workerId: profile.id, qualificationId, institute, passoutYear, score },
  });
};

export const updateEducation = async (userId: string, educationId: string, data: any) => {
  const profile = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError("Profile not found");

  const education = await prisma.workerEducation.findFirst({
    where: { id: educationId, workerId: profile.id },
  });
  if (!education) throw new NotFoundError("Education entry not found");

  return prisma.workerEducation.update({ where: { id: educationId }, data });
};

export const deleteEducation = async (userId: string, educationId: string) => {
  const profile = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError("Profile not found");

  const education = await prisma.workerEducation.findFirst({
    where: { id: educationId, workerId: profile.id },
  });
  if (!education) throw new NotFoundError("Education entry not found");

  await prisma.workerEducation.delete({ where: { id: educationId } });
  return { deleted: true };
};

// ───────────── Experience ─────────────
export const addExperience = async (
  userId: string,
  companyName: string,
  jobTitle: string,
  fromDate: string,
  toDate?: string,
  isCurrent?: boolean,
  description?: string,
) => {
  const profile = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError("Profile not found — create it first");

  return prisma.workerExperience.create({
    data: {
      workerId: profile.id,
      companyName,
      jobTitle,
      fromDate: new Date(fromDate),
      toDate: toDate ? new Date(toDate) : undefined,
      isCurrent: !!isCurrent,
      description,
    },
  });
};

export const updateExperience = async (userId: string, experienceId: string, data: any) => {
  const profile = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError("Profile not found");

  const experience = await prisma.workerExperience.findFirst({
    where: { id: experienceId, workerId: profile.id },
  });
  if (!experience) throw new NotFoundError("Experience entry not found");

  if (data.fromDate) data.fromDate = new Date(data.fromDate);
  if (data.toDate) data.toDate = new Date(data.toDate);

  return prisma.workerExperience.update({ where: { id: experienceId }, data });
};

export const deleteExperience = async (userId: string, experienceId: string) => {
  const profile = await prisma.workerProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError("Profile not found");

  const experience = await prisma.workerExperience.findFirst({
    where: { id: experienceId, workerId: profile.id },
  });
  if (!experience) throw new NotFoundError("Experience entry not found");

  await prisma.workerExperience.delete({ where: { id: experienceId } });
  return { deleted: true };
};

// ───────────── Recruiter/Admin-facing search ─────────────
// NOTE: category-gating (limiting recruiters to only their assigned
// industries) needs the recruiter's assignedCategories from the JWT, cross-
// referenced against each worker's preferredIndustryIds. We're not filtering
// by that yet since it depends on Admin Service's category data being
// reliably present on every JWT — wire this in once Job Service exists and
// we can test the full flow together.
export const searchWorkers = async (filters: { skillId?: number; city?: string }) => {
  const where: any = { profileComplete: true };
  if (filters.skillId) where.skillIds = { has: filters.skillId };
  if (filters.city) where.city = filters.city;

  return prisma.workerProfile.findMany({
    where,
    select: {
      id: true,
      userId: true,
      name: true,
      headline: true,
      city: true,
      skillIds: true,
      totalExperienceMonths: true,
      resumeUrl: true,
    },
  });
};

export const getWorkerById = async (id: string) => {
  const worker = await prisma.workerProfile.findUnique({
    where: { id },
    include: { education: true, experience: true },
  });
  if (!worker) throw new NotFoundError("Worker not found");
  return worker;
};