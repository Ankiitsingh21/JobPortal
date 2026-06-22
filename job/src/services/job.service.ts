import { prisma } from "../config/db";
import { BadRequestError, ForbiddenError, NotFoundError } from "../common";
import { natsWrapper } from "../natswrapper";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["active", "closed"],
  active: ["closed"],
  closed: [],
};

export const createJob = async (postedBy: string, body: Record<string, any>) => {
  const {
    title, description, industryId, functionId, jobRoleId, locationId,
    wageMin, wageMax, wageType, shiftType, jobType,
    headcountRequired, minExperienceMonths, skillIds, qualificationIds,
  } = body;

  return prisma.job.create({
    data: {
      title, description, industryId, functionId, jobRoleId, locationId,
      wageMin, wageMax, wageType, shiftType, jobType,
      headcountRequired,
      minExperienceMonths: minExperienceMonths ?? 0,
      skillIds: skillIds ?? [],
      qualificationIds: qualificationIds ?? [],
      postedBy,
    },
  });
};

// Role-aware listing:
// worker -> active jobs only
// recruiter -> only their own posted jobs
// super_admin -> everything
export const listJobs = async (role: string, userId: string) => {
  if (role === "worker") {
    return prisma.job.findMany({ where: { status: "active" }, orderBy: { createdAt: "desc" } });
  }
  if (role === "recruiter") {
    return prisma.job.findMany({ where: { postedBy: userId }, orderBy: { createdAt: "desc" } });
  }
  return prisma.job.findMany({ orderBy: { createdAt: "desc" } });
};

export const getJob = async (id: string) => {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) throw new NotFoundError("Job not found");
  return job;
};

const assertOwnerOrAdmin = (job: { postedBy: string }, currentUser: { id: string; role: string }) => {
  if (currentUser.role === "super_admin") return;
  if (job.postedBy !== currentUser.id) {
    throw new ForbiddenError("You can only modify jobs you posted");
  }
};

export const updateJob = async (id: string, currentUser: { id: string; role: string }, data: Record<string, any>) => {
  const job = await getJob(id);
  assertOwnerOrAdmin(job, currentUser);

  return prisma.job.update({ where: { id }, data });
};

export const updateJobStatus = async (
  id: string,
  currentUser: { id: string; role: string },
  newStatus: string,
) => {
  const job = await getJob(id);
  assertOwnerOrAdmin(job, currentUser);

  const allowed = ALLOWED_TRANSITIONS[job.status];
  if (!allowed.includes(newStatus)) {
    throw new BadRequestError(`Cannot move job from ${job.status} to ${newStatus}`);
  }

  const updated = await prisma.job.update({ where: { id }, data: { status: newStatus as any } });

  // TODO: once Notification Service exists, publish "job.status.changed"
  // here when status becomes "active", so matching workers get notified.
  if (newStatus === "active") {
  natsWrapper.publish("job.status.changed", { jobId: id, status: newStatus });
}
  console.log(`[DEV ONLY] Job ${id} status changed: ${job.status} -> ${newStatus}`);

  return updated;
};

export const deleteJob = async (id: string, currentUser: { id: string; role: string }) => {
  const job = await getJob(id);
  assertOwnerOrAdmin(job, currentUser);

  if (job.status !== "draft") {
    throw new BadRequestError("Only draft jobs can be deleted — close active jobs instead");
  }

  await prisma.job.delete({ where: { id } });
  return { deleted: true };
};

export const assignJobToRecruiter = async (id: string, newRecruiterUserId: string) => {
  await getJob(id);
  return prisma.job.update({ where: { id }, data: { postedBy: newRecruiterUserId } });
};

// ───────────── Internal: called by Admin Service for reports ─────────────
export const listJobsByRecruiter = async (postedBy: string) => {
  return prisma.job.findMany({ where: { postedBy } });
};