import "dotenv/config";

import * as XLSX from "xlsx";
import path from "path";
import { prisma } from "../src/config/db";

const FILE_PATH = path.join(
  __dirname,
  "../data/All_Data_Update_in_Portal.xlsx",
);

type Row = Record<string, any>;

const normalize = (value: unknown) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const firstValue = (row: Row) => {
  const value = Object.values(row).find(
    (v) => String(v ?? "").trim().length > 0,
  );
  return String(value ?? "").trim();
};

const seed = async () => {
  const workbook = XLSX.readFile(FILE_PATH);

  const getSheet = (name: string) => {
    const matchedKey = workbook.SheetNames.find(
      (s) => s.trim().toLowerCase() === name.trim().toLowerCase(),
    );

    if (!matchedKey) {
      console.warn(`Sheet "${name}" not found, skipping`);
      return [] as Row[];
    }

    return XLSX.utils.sheet_to_json<Row>(workbook.Sheets[matchedKey]);
  };

  // ===================== Industry =====================
  const industryRows = getSheet("industry");
  await prisma.industry.createMany({
    data: industryRows
      .map((r) => ({ name: firstValue(r) }))
      .filter((x) => x.name),
    skipDuplicates: true,
  });
  console.log(`Seeded ${industryRows.length} industries`);

  // ===================== Skills =====================
  const skillRows = getSheet("SKILLS");
  await prisma.skill.createMany({
    data: skillRows.map((r) => ({ name: firstValue(r) })).filter((x) => x.name),
    skipDuplicates: true,
  });
  console.log(`Seeded ${skillRows.length} skills`);

  // ===================== Languages =====================
  const languageRows = getSheet("Language");
  await prisma.language.createMany({
    data: languageRows
      .map((r) => ({ name: firstValue(r) }))
      .filter((x) => x.name),
    skipDuplicates: true,
  });
  console.log(`Seeded ${languageRows.length} languages`);

  // ===================== Job Functions =====================
  const functionRows = getSheet("Function");
  await prisma.jobFunction.createMany({
    data: functionRows
      .map((r) => ({ name: firstValue(r) }))
      .filter((x) => x.name),
    skipDuplicates: true,
  });
  console.log(`Seeded ${functionRows.length} functions`);

  // ===================== Qualifications =====================
  const qualificationRows = getSheet("Qualification");
  await prisma.qualification.createMany({
    data: qualificationRows
      .map((r) => ({
        name: firstValue(r),
        level: "general",
      }))
      .filter((x) => x.name),
    skipDuplicates: true,
  });
  console.log(`Seeded ${qualificationRows.length} qualifications`);

  // ===================== Locations =====================
  // The "Location" sheet is horizontal:
  // Row 1 => headers like "Delhi / Delhi", "Noida / Uttar Pradesh", etc.
  // Rows 2..n => locality values under each city/state column.
  const locationSheetName =
    workbook.SheetNames.find((s) => s.trim().toLowerCase() === "location") ??
    null;

  if (!locationSheetName) {
    console.warn('Sheet "Location" not found, skipping locations');
  } else {
    const locationSheet = workbook.Sheets[locationSheetName];
    const matrix = XLSX.utils.sheet_to_json<any[]>(locationSheet, {
      header: 1,
      defval: "",
    });

    const headers = (matrix[0] ?? []).map((h) => String(h ?? "").trim());

    const headerMap: Record<string, { state: string; city: string }> = {
      [normalize("Delhi / Delhi")]: { state: "Delhi", city: "Delhi" },
      [normalize("Noida / Uttar Pradesh")]: {
        state: "Uttar Pradesh",
        city: "Noida",
      },
      [normalize("Greater Noida /Uttar Pradesh")]: {
        state: "Uttar Pradesh",
        city: "Greater Noida",
      },
      [normalize("Gurugram / Haryana")]: { state: "Haryana", city: "Gurugram" },
      [normalize("Haryana / Faridabad/ Locality")]: {
        state: "Haryana",
        city: "Faridabad",
      },
      [normalize("Uttar Pradesh / Ghaziabad / Locality")]: {
        state: "Uttar Pradesh",
        city: "Ghaziabad",
      },
      [normalize("Uttar Pradesh / Meerut /Locality")]: {
        state: "Uttar Pradesh",
        city: "Meerut",
      },
      [normalize("Uttar Pradesh/ Kanpur //Locality")]: {
        state: "Uttar Pradesh",
        city: "Kanpur",
      },
      [normalize("Uttar Pradesh / Luckknow /Locality")]: {
        state: "Uttar Pradesh",
        city: "Lucknow",
      },
      [normalize("Maharashtra / Mumbai//Locality")]: {
        state: "Maharashtra",
        city: "Mumbai",
      },
      [normalize("Haryana/ Punjab /Chandigarh")]: {
        state: "Punjab",
        city: "Chandigarh",
      },
      [normalize("Mahrastra / Pune / Locality")]: {
        state: "Maharashtra",
        city: "Pune",
      },
      [normalize("Bihar / Patna / Locality")]: {
        state: "Bihar",
        city: "Patna",
      },
      [normalize("Bihar / Bodh Gaya / Locality")]: {
        state: "Bihar",
        city: "Bodh Gaya",
      },
      [normalize("HARYANA/ HISAR/ LOCALITY")]: {
        state: "Haryana",
        city: "Hisar",
      },
      [normalize("HARYANA/AMBALA/LOCALITY")]: {
        state: "Haryana",
        city: "Ambala",
      },
      [normalize("HARYANA / KARNAL/LOCALITY")]: {
        state: "Haryana",
        city: "Karnal",
      },
      [normalize("Jaipur STATE RAJESTHAN /LOCALITY")]: {
        state: "Rajasthan",
        city: "Jaipur",
      },
    };

    const locations: { state: string; city: string; locality: string }[] = [];

    for (let rowIndex = 1; rowIndex < matrix.length; rowIndex++) {
      const row = matrix[rowIndex] ?? [];

      for (let colIndex = 0; colIndex < headers.length; colIndex++) {
        const header = headers[colIndex];
        if (!header) continue;

        const locality = String(row[colIndex] ?? "").trim();
        if (!locality) continue;

        const cleanedHeader = normalize(header);

        const mapped = headerMap[cleanedHeader];
        if (mapped) {
          locations.push({
            state: mapped.state,
            city: mapped.city,
            locality,
          });
          continue;
        }

        // Fallback parser for any unexpected header format.
        const parts = String(header)
          .replace(/locality/gi, "")
          .replace(/\s+/g, " ")
          .split("/")
          .map((x) => x.trim())
          .filter(Boolean);

        let state = "";
        let city = "";

        if (parts.length >= 2) {
          city = parts[0];
          state = parts[1];
        } else if (parts.length === 1) {
          city = parts[0];
        }

        locations.push({
          state,
          city,
          locality,
        });
      }
    }

    console.log("First 10 parsed locations:");
    console.log(locations.slice(0, 10));
    await prisma.location.createMany({
      data: locations,
      skipDuplicates: true,
    });

    console.log(`Seeded ${locations.length} locations`);
  }

  // ===================== Job Roles =====================
  // This sheet contains only role names, no function mapping.
  // So we seed them with functionId = null.
  const jobRoleRows = getSheet("Job Role");

  await prisma.jobRole.createMany({
    data: jobRoleRows
      .map((r) => ({
        name: firstValue(r),
        functionId: null,
      }))
      .filter((x) => x.name),
    skipDuplicates: true,
  });

  console.log(`Seeded ${jobRoleRows.length} job roles`);

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
