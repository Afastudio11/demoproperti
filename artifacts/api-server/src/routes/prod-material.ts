import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { prodMaterialMasterTable, prodMaterialInTable, prodMaterialOutTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const SEED_MATERIALS = [
  { category: "A - Pendahuluan", name: "Tali Tukang", satuan: "m", standardPerUnit: 50 },
  { category: "B - Struktur", name: "Timbunan Tanah", satuan: "m3", standardPerUnit: 10 },
  { category: "B - Struktur", name: "Batu Gunung", satuan: "m3", standardPerUnit: 5 },
  { category: "B - Struktur", name: "Semen", satuan: "zak", standardPerUnit: 65 },
  { category: "B - Struktur", name: "Pasir", satuan: "m3", standardPerUnit: 8 },
  { category: "B - Struktur", name: "Kerikil", satuan: "m3", standardPerUnit: 4 },
  { category: "B - Struktur", name: "Besi 10 Full", satuan: "btg", standardPerUnit: 40 },
  { category: "B - Struktur", name: "Besi 8 Full", satuan: "btg", standardPerUnit: 20 },
  { category: "B - Struktur", name: "Besi 6 Full", satuan: "btg", standardPerUnit: 15 },
  { category: "B - Struktur", name: "Papan", satuan: "lbr", standardPerUnit: 10 },
  { category: "B - Struktur", name: "Balok", satuan: "btg", standardPerUnit: 8 },
  { category: "B - Struktur", name: "Triplek 8mm", satuan: "lbr", standardPerUnit: 4 },
  { category: "B - Struktur", name: "Bambu", satuan: "btg", standardPerUnit: 20 },
  { category: "B - Struktur", name: "Paku 10", satuan: "kg", standardPerUnit: 2 },
  { category: "B - Struktur", name: "Paku 7", satuan: "kg", standardPerUnit: 1.5 },
  { category: "B - Struktur", name: "Paku 5", satuan: "kg", standardPerUnit: 1 },
  { category: "B - Struktur", name: "Bata Merah", satuan: "bh", standardPerUnit: 3000 },
  { category: "C - Atap & Rangka", name: "Canal C", satuan: "btg", standardPerUnit: 20 },
  { category: "C - Atap & Rangka", name: "Reng Rangka", satuan: "btg", standardPerUnit: 30 },
  { category: "C - Atap & Rangka", name: "Spandek 6m", satuan: "lbr", standardPerUnit: 15 },
  { category: "C - Atap & Rangka", name: "Spandek 7m", satuan: "lbr", standardPerUnit: 5 },
  { category: "C - Atap & Rangka", name: "Baut Spandek", satuan: "dos", standardPerUnit: 2 },
  { category: "C - Atap & Rangka", name: "Hollow 2,4", satuan: "btg", standardPerUnit: 10 },
  { category: "C - Atap & Rangka", name: "Hollow 4,4", satuan: "btg", standardPerUnit: 8 },
  { category: "D - Finishing", name: "Keramik WC 25x40", satuan: "dos", standardPerUnit: 3 },
  { category: "D - Finishing", name: "Keramik 40x40", satuan: "dos", standardPerUnit: 6 },
  { category: "D - Finishing", name: "Keramik WC 25x25", satuan: "dos", standardPerUnit: 2 },
  { category: "D - Finishing", name: "Sika Nat Keramik", satuan: "kg", standardPerUnit: 3 },
  { category: "D - Finishing", name: "Gypsum", satuan: "lbr", standardPerUnit: 12 },
  { category: "D - Finishing", name: "Pintu", satuan: "bh", standardPerUnit: 4 },
  { category: "D - Finishing", name: "Jendela", satuan: "bh", standardPerUnit: 4 },
  { category: "D - Finishing", name: "Aplus Hijau", satuan: "zak", standardPerUnit: 8 },
  { category: "D - Finishing", name: "Cat AM Luar Putih", satuan: "kg", standardPerUnit: 15 },
  { category: "D - Finishing", name: "Cat Propan Luar Krem/Hijau", satuan: "kg", standardPerUnit: 10 },
  { category: "D - Finishing", name: "Cat AM Luar Grey", satuan: "kg", standardPerUnit: 5 },
  { category: "D - Finishing", name: "Cat Kimex Dalam Putih", satuan: "kg", standardPerUnit: 10 },
  { category: "D - Finishing", name: "Cat Plafon Vinilex", satuan: "kg", standardPerUnit: 8 },
  { category: "D - Finishing", name: "Cat Nodrop Grey", satuan: "kg", standardPerUnit: 4 },
  { category: "D - Finishing", name: "Cat Altex Cokelat", satuan: "kg", standardPerUnit: 3 },
  { category: "D - Finishing", name: "Cat Altex Putih", satuan: "kg", standardPerUnit: 3 },
  { category: "E - Instalasi Listrik", name: "Kabel 1x1,5 Biru", satuan: "m", standardPerUnit: 15 },
  { category: "E - Instalasi Listrik", name: "Kabel 1x1,5 Merah", satuan: "m", standardPerUnit: 15 },
  { category: "E - Instalasi Listrik", name: "Kabel 1x1,5 Hitam", satuan: "m", standardPerUnit: 10 },
  { category: "E - Instalasi Listrik", name: "Kabel 2x2,5 Eterna", satuan: "m", standardPerUnit: 20 },
  { category: "E - Instalasi Listrik", name: "MCB", satuan: "bh", standardPerUnit: 1 },
  { category: "E - Instalasi Listrik", name: "Fitting Lampu", satuan: "bh", standardPerUnit: 6 },
  { category: "E - Instalasi Listrik", name: "Lampu 10 Watt", satuan: "bh", standardPerUnit: 6 },
  { category: "E - Instalasi Listrik", name: "Saklar Tunggal", satuan: "bh", standardPerUnit: 3 },
  { category: "E - Instalasi Listrik", name: "Saklar Seri", satuan: "bh", standardPerUnit: 2 },
  { category: "E - Instalasi Listrik", name: "Stop Kontak", satuan: "bh", standardPerUnit: 4 },
  { category: "F - Instalasi Air", name: "Pipa 1/2\"", satuan: "btg", standardPerUnit: 10 },
  { category: "F - Instalasi Air", name: "Pipa 2,5\"", satuan: "btg", standardPerUnit: 5 },
  { category: "F - Instalasi Air", name: "Pipa 3\"", satuan: "btg", standardPerUnit: 3 },
  { category: "F - Instalasi Air", name: "Kran Air 1/2\"", satuan: "bh", standardPerUnit: 3 },
  { category: "F - Instalasi Air", name: "Wastafel", satuan: "bh", standardPerUnit: 1 },
  { category: "F - Instalasi Air", name: "Kloset", satuan: "bh", standardPerUnit: 1 },
  { category: "F - Instalasi Air", name: "Lem Pipa 400gr", satuan: "bh", standardPerUnit: 2 },
];

router.get("/produksi/material/master", async (req, res) => {
  try {
    let rows = await db.select().from(prodMaterialMasterTable).orderBy(prodMaterialMasterTable.category);
    if (rows.length === 0) {
      await db.insert(prodMaterialMasterTable).values(SEED_MATERIALS);
      rows = await db.select().from(prodMaterialMasterTable).orderBy(prodMaterialMasterTable.category);
    }
    res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list material master");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/produksi/material/master", async (req, res) => {
  try {
    const [row] = await db.insert(prodMaterialMasterTable).values(req.body).returning();
    res.status(201).json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create material");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.patch("/produksi/material/master/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.update(prodMaterialMasterTable).set(req.body).where(eq(prodMaterialMasterTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update material");
    res.status(400).json({ error: "Invalid request" });
  }
});

// ─── MATERIAL IN (Masuk) ─────────────────────────────────────────────────────

router.get("/produksi/material/in", async (req, res) => {
  try {
    let rows = await db.select().from(prodMaterialInTable).orderBy(prodMaterialInTable.dateIn);
    if (req.query.projectId) {
      const pid = parseInt(req.query.projectId as string);
      rows = rows.filter(r => r.projectId === pid);
    }
    const masters = await db.select().from(prodMaterialMasterTable);
    const enriched = rows.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      material: masters.find(m => m.id === r.materialId) ?? null,
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to list material in");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/produksi/material/in", async (req, res) => {
  try {
    const [row] = await db.insert(prodMaterialInTable).values(req.body).returning();
    res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create material in");
    res.status(400).json({ error: "Invalid request" });
  }
});

// ─── MATERIAL OUT (Keluar) ────────────────────────────────────────────────────

router.get("/produksi/material/out", async (req, res) => {
  try {
    let rows = await db.select().from(prodMaterialOutTable).orderBy(prodMaterialOutTable.dateOut);
    if (req.query.projectId) {
      const pid = parseInt(req.query.projectId as string);
      rows = rows.filter(r => r.projectId === pid);
    }
    const masters = await db.select().from(prodMaterialMasterTable);
    const enriched = rows.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      material: masters.find(m => m.id === r.materialId) ?? null,
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to list material out");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/produksi/material/out", async (req, res) => {
  try {
    const [row] = await db.insert(prodMaterialOutTable).values(req.body).returning();
    res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create material out");
    res.status(400).json({ error: "Invalid request" });
  }
});

// ─── STOK GUDANG (computed) ───────────────────────────────────────────────────

router.get("/produksi/material/stok", async (req, res) => {
  try {
    const masters = await db.select().from(prodMaterialMasterTable);
    let inRows = await db.select().from(prodMaterialInTable);
    let outRows = await db.select().from(prodMaterialOutTable);

    if (req.query.projectId) {
      const pid = parseInt(req.query.projectId as string);
      inRows = inRows.filter(r => r.projectId === pid);
      outRows = outRows.filter(r => r.projectId === pid);
    }

    const stok = masters.map(m => {
      const totalMasuk = inRows.filter(r => r.materialId === m.id).reduce((s, r) => s + r.quantity, 0);
      const totalKeluar = outRows.filter(r => r.materialId === m.id).reduce((s, r) => s + r.quantity, 0);
      const stokAktual = totalMasuk - totalKeluar;
      const nilaiStok = stokAktual * (m.unitPrice ?? 0);
      const isBelowMinimum = stokAktual < m.minimumStock;
      return {
        ...m,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
        totalMasuk,
        totalKeluar,
        stokAktual,
        nilaiStok,
        isBelowMinimum,
      };
    });
    res.json(stok);
  } catch (err) {
    req.log.error({ err }, "Failed to compute stok");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
