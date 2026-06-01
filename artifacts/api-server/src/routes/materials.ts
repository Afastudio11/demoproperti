import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { materialsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateMaterialBody, UpdateMaterialBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/materials", async (req, res) => {
  try {
    let materials = await db.select().from(materialsTable);
    if (req.query.projectId) {
      const pid = parseInt(req.query.projectId as string);
      materials = materials.filter(m => m.projectId === pid);
    }
    const result = materials.map(m => ({
      ...m,
      vendor: m.vendor ?? null,
      harga: m.harga ?? null,
      isBelowMinimum: m.stok < m.minimumStock,
      createdAt: m.createdAt.toISOString(),
    }));
    if (req.query.belowMinimum === "true") {
      return res.json(result.filter(m => m.isBelowMinimum));
    }
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list materials");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/materials", async (req, res) => {
  try {
    const body = CreateMaterialBody.parse(req.body);
    const [material] = await db.insert(materialsTable).values(body).returning();
    res.status(201).json({ ...material, vendor: material.vendor ?? null, harga: material.harga ?? null, isBelowMinimum: material.stok < material.minimumStock, createdAt: material.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create material");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.patch("/materials/:id", async (req, res) => {
  try {
    const body = UpdateMaterialBody.parse(req.body);
    const [material] = await db.update(materialsTable).set(body).where(eq(materialsTable.id, parseInt(req.params.id))).returning();
    if (!material) return res.status(404).json({ error: "Not found" });
    res.json({ ...material, vendor: material.vendor ?? null, harga: material.harga ?? null, isBelowMinimum: material.stok < material.minimumStock, createdAt: material.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update material");
    res.status(400).json({ error: "Invalid request" });
  }
});

export default router;
