import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { fasumProgressTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

const FASUM_TYPES = ["Jalan", "Drainase", "Taman", "IPAL", "Masjid", "Gorong-gorong", "Gerbang", "Selokan", "Gazebo", "Paving Block"];

router.get("/produksi/fasum", async (req, res) => {
  try {
    let rows = await db.select().from(fasumProgressTable).orderBy(fasumProgressTable.createdAt);
    if (req.query.projectId) {
      const pid = parseInt(req.query.projectId as string);
      rows = rows.filter(r => r.projectId === pid);
    }
    res.json({ rows: rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })), fasumTypes: FASUM_TYPES });
  } catch (err) {
    req.log.error({ err }, "Failed to list fasum progress");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/produksi/fasum", async (req, res) => {
  try {
    const { projectId, stageCode, fasumType, progressPercent, notes, updatedBy, subkonName } = req.body as {
      projectId: number;
      stageCode?: string;
      fasumType: string;
      progressPercent: number;
      notes?: string;
      updatedBy?: string;
      subkonName?: string;
    };

    const existingRows = await db.select().from(fasumProgressTable)
      .where(and(eq(fasumProgressTable.projectId, projectId), eq(fasumProgressTable.fasumType, fasumType)));
    const existing = existingRows.find(row => (row.subkonName ?? "") === (subkonName ?? ""));

    if (existing) {
      const [row] = await db.update(fasumProgressTable).set({
        progressPercent,
        notes: notes ?? null,
        updatedBy: updatedBy ?? null,
        stageCode: stageCode ?? null,
        subkonName: subkonName ?? null,
      }).where(eq(fasumProgressTable.id, existing.id)).returning();
      return res.json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
    }

    const [row] = await db.insert(fasumProgressTable).values({
      projectId,
      stageCode: stageCode ?? null,
      fasumType,
      progressPercent,
      notes: notes ?? null,
      updatedBy: updatedBy ?? null,
      subkonName: subkonName ?? null,
    }).returning();
    res.status(201).json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to upsert fasum progress");
    res.status(400).json({ error: "Invalid request" });
  }
});

export default router;
