-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('full_time', 'part_time', 'contract');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('immediate', 'within_15_days', 'within_30_days');

-- CreateTable
CREATE TABLE "WorkerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "dob" TIMESTAMP(3),
    "gender" TEXT,
    "city" TEXT,
    "currentLocality" TEXT,
    "profilePhotoUrl" TEXT,
    "headline" TEXT,
    "summary" TEXT,
    "totalExperienceMonths" INTEGER NOT NULL DEFAULT 0,
    "expectedSalaryMin" INTEGER,
    "expectedSalaryMax" INTEGER,
    "jobType" "JobType",
    "availability" "Availability",
    "resumeUrl" TEXT,
    "profileComplete" BOOLEAN NOT NULL DEFAULT false,
    "skillIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "languageIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "preferredLocationIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "preferredIndustryIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerEducation" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "qualificationId" INTEGER NOT NULL,
    "institute" TEXT,
    "passoutYear" INTEGER,
    "score" TEXT,

    CONSTRAINT "WorkerEducation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerExperience" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,

    CONSTRAINT "WorkerExperience_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkerProfile_userId_key" ON "WorkerProfile"("userId");

-- AddForeignKey
ALTER TABLE "WorkerEducation" ADD CONSTRAINT "WorkerEducation_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerExperience" ADD CONSTRAINT "WorkerExperience_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
