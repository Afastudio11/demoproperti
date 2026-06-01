import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { feasibilityStudiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateFeasibilityStudyBody, UpdateFeasibilityStudyBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/feasibility", async (req, res) => {
  try {
    let studies = await db.select().from(feasibilityStudiesTable);
    if (req.query.projectId) {
      const pid = parseInt(req.query.projectId as string);
      studies = studies.filter(s => s.projectId === pid);
    }
    res.json(studies.map(s => ({
      ...s,
      approvedAt: s.approvedAt ?? null,
      catatan: s.catatan ?? null,
      createdAt: s.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list feasibility studies");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/feasibility", async (req, res) => {
  try {
    const body = CreateFeasibilityStudyBody.parse(req.body);
    const [study] = await db.insert(feasibilityStudiesTable).values(body).returning();
    res.status(201).json({ ...study, approvedAt: study.approvedAt ?? null, catatan: study.catatan ?? null, createdAt: study.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create feasibility study");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.get("/feasibility/:id", async (req, res) => {
  try {
    const [study] = await db.select().from(feasibilityStudiesTable).where(eq(feasibilityStudiesTable.id, parseInt(req.params.id)));
    if (!study) return res.status(404).json({ error: "Not found" });
    res.json({ ...study, approvedAt: study.approvedAt ?? null, catatan: study.catatan ?? null, createdAt: study.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to get feasibility study");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/feasibility/:id", async (req, res) => {
  try {
    const body = UpdateFeasibilityStudyBody.parse(req.body);
    const [study] = await db.update(feasibilityStudiesTable).set(body).where(eq(feasibilityStudiesTable.id, parseInt(req.params.id))).returning();
    if (!study) return res.status(404).json({ error: "Not found" });
    res.json({ ...study, approvedAt: study.approvedAt ?? null, catatan: study.catatan ?? null, createdAt: study.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update feasibility study");
    res.status(400).json({ error: "Invalid request" });
  }
});

export default router;
