-- CreateEnum
CREATE TYPE "WageType" AS ENUM ('daily', 'monthly');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('day', 'night', 'rotational');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('full_time', 'part_time', 'contract');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('draft', 'active', 'closed');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "industryId" INTEGER NOT NULL,
    "functionId" INTEGER,
    "jobRoleId" INTEGER,
    "locationId" INTEGER NOT NULL,
    "wageMin" INTEGER,
    "wageMax" INTEGER,
    "wageType" "WageType",
    "shiftType" "ShiftType",
    "jobType" "JobType",
    "headcountRequired" INTEGER NOT NULL,
    "headcountFilled" INTEGER NOT NULL DEFAULT 0,
    "minExperienceMonths" INTEGER NOT NULL DEFAULT 0,
    "status" "JobStatus" NOT NULL DEFAULT 'draft',
    "postedBy" TEXT NOT NULL,
    "skillIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "qualificationIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_industryId_idx" ON "Job"("industryId");

-- CreateIndex
CREATE INDEX "Job_postedBy_idx" ON "Job"("postedBy");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");
