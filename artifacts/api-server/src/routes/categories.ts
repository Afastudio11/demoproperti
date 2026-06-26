import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { appCategoriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULT_SEED_CATEGORIES: Record<string, string[]> = {
  hr_lokasi: ["Makassar (HQ)", "Barru", "Villa Sinoa", "Lapangan", "Remote"],
  hr_divisi: ["CEO Office", "Planning", "Legal", "Marketing", "Administrasi", "Produksi", "Finance", "HR"],
  qc_kategori_defect: ["Struktur", "Dinding", "Atap", "Keramik", "Cat", "Instalasi Listrik", "Instalasi Air", "Kusen & Pintu", "Plafon", "Lainnya"],
  marketing_platform: ["Instagram", "Facebook", "TikTok", "Google Ads", "YouTube", "Twitter/X", "WhatsApp Blast"],
  material_kategori: ["A - Pendahuluan", "B - Struktur", "C - Atap & Rangka", "D - Finishing", "E - Instalasi Listrik", "F - Instalasi Air"],
  hr_tipe_training: ["Training Internal", "Training Eksternal", "Coaching", "Sertifikasi", "Workshop"],
  hr_sumber_rekrutmen: ["Referral Internal", "Job Portal", "LinkedIn", "Walk In", "Headhunter"]
};

router.get("/categories", async (req, res) => {
  try {
    const { type } = req.query;
    if (!type || typeof type !== "string") {
      return res.status(400).json({ error: "Parameter 'type' diperlukan" });
    }
    let rows = await db
      .select()
      .from(appCategoriesTable)
      .where(eq(appCategoriesTable.type, type));

    if (rows.length === 0 && DEFAULT_SEED_CATEGORIES[type]) {
      const defaults = DEFAULT_SEED_CATEGORIES[type];
      const insertValues = defaults.map(label => ({ type, label }));
      rows = await db.insert(appCategoriesTable).values(insertValues).returning();
    }

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to get categories");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const { type, label } = req.body;
    if (!type || !label) {
      return res.status(400).json({ error: "'type' dan 'label' diperlukan" });
    }
    const [row] = await db
      .insert(appCategoriesTable)
      .values({ type: String(type), label: String(label) })
      .returning();
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to create category");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID tidak valid" });
    await db.delete(appCategoriesTable).where(eq(appCategoriesTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete category");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { label } = req.body;
    if (isNaN(id)) return res.status(400).json({ error: "ID tidak valid" });
    if (!label) return res.status(400).json({ error: "Label diperlukan" });
    const [row] = await db
      .update(appCategoriesTable)
      .set({ label: String(label) })
      .where(eq(appCategoriesTable.id, id))
      .returning();
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to update category");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
