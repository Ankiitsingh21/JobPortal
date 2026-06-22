import axios from "axios";
import { prisma } from "../config/db";
import { BadRequestError, ForbiddenError, NotFoundError } from "../common";
import { natsWrapper } from "../natswrapper";

const JOB_SERVICE_URL = process.env.JOB_SERVICE_URL!;

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  applied: ["shortlisted", "rejected"],
  shortlisted: ["interview_scheduled", "rejected"],
  interview_scheduled: ["hired", "rejected"],
  hired: [],
  rejected: [],
};

const fetchJob = async (jobId: string) => {
  try {
    const res = await axios.get(`${JOB_SERVICE_URL}/api/jobs/internal/${jobId}`);
    return res.data.data;
  } catch {
    throw new BadRequestError("Job not found or Job Service unreachable");
  }
};

export const applyToJob = async (workerId: string, jobId: string, coverNote?: string) => {
  const existing = await prisma.application.findUnique({
    where: { jobId_workerId: { jobId, workerId } },
  });
  if (existing) throw new BadRequestError("You have already applied to this job");

  const job = await fetchJob(jobId);
  if (job.status !== "active") throw new BadRequestError("This job is not accepting applications");

  const application = await prisma.application.create({
    data: { jobId, workerId, recruiterId: job.postedBy, coverNote },
  });

  await prisma.applicationStatusHistory.create({
    data: { applicationId: application.id, toStatus: "applied", changedBy: workerId },
  });

  return application;
};

export const listMyApplications = async (workerId: string) => {
  return prisma.application.findMany({ where: { workerId }, orderBy: { appliedAt: "desc" } });
};

export const listApplicationsForJob = async (
  jobId: string,
  currentUser: { id: string; role: string },
) => {
  const apps = await prisma.application.findMany({ where: { jobId }, orderBy: { appliedAt: "desc" } });
  if (apps.length && currentUser.role !== "super_admin" && apps[0].recruiterId !== currentUser.id) {
    throw new ForbiddenError("You can only view applicants for jobs you posted");
  }
  return apps;
};

export const getApplication = async (id: string, currentUser: { id: string; role: string }) => {
  const app = await prisma.application.findUnique({ where: { id }, include: { history: true } });
  if (!app) throw new NotFoundError("Application not found");

  const isOwnerWorker = app.workerId === currentUser.id;
  const isOwnerRecruiter = app.recruiterId === currentUser.id;
  if (!isOwnerWorker && !isOwnerRecruiter && currentUser.role !== "super_admin") {
    throw new ForbiddenError("Not authorized to view this application");
  }

  return app;
};

export const updateStatus = async (
  id: string,
  currentUser: { id: string; role: string },
  newStatus: string,
  notes?: string,
) => {
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) throw new NotFoundError("Application not found");

  if (currentUser.role !== "super_admin" && app.recruiterId !== currentUser.id) {
    throw new ForbiddenError("You can only update applications for jobs you posted");
  }

  const allowed = ALLOWED_TRANSITIONS[app.status];
  if (!allowed.includes(newStatus)) {
    throw new BadRequestError(`Cannot move application from ${app.status} to ${newStatus}`);
  }

  const updated = await prisma.application.update({ where: { id }, data: { status: newStatus as any } });

  await prisma.applicationStatusHistory.create({
    data: { applicationId: id, fromStatus: app.status, toStatus: newStatus, changedBy: currentUser.id, notes },
  });

  natsWrapper.publish("application.status.changed", {
    applicationId: id,
    jobId: app.jobId,
    workerId: app.workerId,
    toStatus: newStatus,
  });

  return updated;
};

export const withdrawApplication = async (id: string, workerId: string) => {
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) throw new NotFoundError("Application not found");
  if (app.workerId !== workerId) throw new ForbiddenError("Not your application");
  if (app.status !== "applied") {
    throw new BadRequestError("Can only withdraw applications still in 'applied' status");
  }

  await prisma.application.delete({ where: { id } });
  return { withdrawn: true };
};

// ───────────── Internal: Admin Service reports ─────────────
export const listByJobIds = async (jobIds: string[]) => {
  return prisma.application.findMany({ where: { jobId: { in: jobIds } } });
};

export const listByRecruiter = async (recruiterId: string) => {
  return prisma.application.findMany({ where: { recruiterId } });
};