import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { appCategoriesTable } from "@workspace/db";

const DEFAULT_SEED_CATEGORIES: Record<string, string[]> = {
  hr_lokasi: ["Makassar (HQ)", "Barru", "Villa Sinoa", "Lapangan", "Remote"],
  hr_divisi: ["CEO Office", "Planning", "Legal", "Marketing", "Administrasi", "Produksi", "Finance", "HR"],
  qc_kategori_defect: ["Struktur", "Dinding", "Atap", "Keramik", "Cat", "Instalasi Listrik", "Instalasi Air", "Kusen & Pintu", "Plafon", "Lainnya"],
  marketing_platform: ["Instagram", "Facebook", "TikTok", "Google Ads", "YouTube", "Twitter/X", "WhatsApp Blast"],
  material_kategori: ["A - Pendahuluan", "B - Struktur", "C - Atap & Rangka", "D - Finishing", "E - Instalasi Listrik", "F - Instalasi Air"],
  hr_tipe_training: ["Training Internal", "Training Eksternal", "Coaching", "Sertifikasi", "Workshop"],
  hr_sumber_rekrutmen: ["Referral Internal", "Job Portal", "LinkedIn", "Walk In", "Headhunter"]
};

async function seedDefaultCategories() {
  try {
    const existing = await db.select().from(appCategoriesTable);
    const missing: { type: string; label: string }[] = [];

    for (const [type, defaults] of Object.entries(DEFAULT_SEED_CATEGORIES)) {
      for (const label of defaults) {
        const exists = existing.some(r => r.type === type && r.label === label);
        if (!exists) {
          missing.push({ type, label });
        }
      }
    }

    if (missing.length > 0) {
      await db.insert(appCategoriesTable).values(missing);
      logger.info({ count: missing.length }, "Seeded default categories on startup");
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed default categories on startup");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

seedDefaultCategories().finally(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
});
