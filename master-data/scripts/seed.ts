import "dotenv/config";

import * as XLSX from "xlsx";
import { prisma } from "../src/config/db";
import path from "path";

const FILE_PATH = path.join(
  __dirname,
  "../data/All_Data_Update_in_Portal.xlsx"
);

const seed = async () => {
  const workbook = XLSX.readFile(FILE_PATH);

  const getSheet = (name: string) => {
    const matchedKey = workbook.SheetNames.find(
      (s) => s.trim().toLowerCase() === name.trim().toLowerCase()
    );

    if (!matchedKey) {
      console.warn(`Sheet "${name}" not found, skipping`);
      return [];
    }

    return XLSX.utils.sheet_to_json<any>(workbook.Sheets[matchedKey]);
  };

  // Helper to get first column value
  const firstValue = (row: any) => String(Object.values(row)[0] ?? "").trim();

  // ===================== Industry =====================
  const industryRows = getSheet("industry");

  await prisma.industry.createMany({
    data: industryRows.map((r) => ({
      name: firstValue(r),
    })),
    skipDuplicates: true,
  });

  console.log(`Seeded ${industryRows.length} industries`);

  // ===================== Skills =====================
  const skillRows = getSheet("SKILLS");

  await prisma.skill.createMany({
    data: skillRows.map((r) => ({
      name: firstValue(r),
    })),
    skipDuplicates: true,
  });

  console.log(`Seeded ${skillRows.length} skills`);

  // ===================== Languages =====================
  const languageRows = getSheet("Language");

  await prisma.language.createMany({
    data: languageRows.map((r) => ({
      name: firstValue(r),
    })),
    skipDuplicates: true,
  });

  console.log(`Seeded ${languageRows.length} languages`);

  // ===================== Job Functions =====================
  const functionRows = getSheet("Function");

  await prisma.jobFunction.createMany({
    data: functionRows.map((r) => ({
      name: firstValue(r),
    })),
    skipDuplicates: true,
  });

  console.log(`Seeded ${functionRows.length} functions`);

  // ===================== Qualifications =====================
  const qualificationRows = getSheet("Qualification");

  await prisma.qualification.createMany({
    data: qualificationRows.map((r) => ({
      name: firstValue(r),
      level: "general",
    })),
    skipDuplicates: true,
  });

  console.log(`Seeded ${qualificationRows.length} qualifications`);

  // ===================== Locations =====================
  const locationRows = getSheet("Location");

  await prisma.location.createMany({
    data: locationRows.map((r) => ({
      state: String(r.State ?? "").trim(),
      city: String(r.City ?? "").trim(),
      locality: String(r.Locality ?? r.Area ?? "").trim(),
    })),
    skipDuplicates: true,
  });

  console.log(`Seeded ${locationRows.length} locations`);

  console.log("✅ Seed complete");
};

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });