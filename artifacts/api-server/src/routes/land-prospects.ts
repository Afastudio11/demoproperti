import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { landProspectsTable, projectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateLandProspectBody, UpdateLandProspectBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/land-prospects", async (req, res) => {
  try {
    let prospects = await db.select().from(landProspectsTable);
    if (req.query.projectId) {
      const pid = parseInt(req.query.projectId as string);
      prospects = prospects.filter(p => p.projectId === pid);
    }
    if (req.query.status) {
      prospects = prospects.filter(p => p.status === req.query.status);
    }
    res.json(prospects.map(p => ({ ...p, createdAt: p.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list land prospects");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/land-prospects", async (req, res) => {
  try {
    const body = CreateLandProspectBody.parse(req.body);
    const riskLevel = (body.aksesJalan != null && body.aksesJalan < 5) ? "red" :
      (body.roi != null && body.roi < 25) ? "yellow" : "green";
    const [prospect] = await db.insert(landProspectsTable).values({ ...body, riskLevel }).returning();
    res.status(201).json({ ...prospect, createdAt: prospect.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create land prospect");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.get("/land-prospects/pipeline-summary", async (req, res) => {
  try {
    const prospects = await db.select().from(landProspectsTable);
    const statusCounts: Record<string, number> = {};
    prospects.forEach(p => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1; });
    res.json(Object.entries(statusCounts).map(([status, count]) => ({ status, count })));
  } catch (err) {
    req.log.error({ err }, "Failed to get pipeline summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Acquisition data endpoints — must be before /:id
router.get("/land-prospects/:id/acquisition", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db
      .select({
        checklistItems: landProspectsTable.checklistItems,
        checklistValues: landProspectsTable.checklistValues,
        surveyData: landProspectsTable.surveyData,
        aiResult: landProspectsTable.aiResult,
        fullAiResult: landProspectsTable.fullAiResult,
      })
      .from(landProspectsTable)
      .where(eq(landProspectsTable.id, id));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to get acquisition data");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/land-prospects/:id/acquisition", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { checklistItems, checklistValues, surveyData, aiResult, fullAiResult } = req.body as {
      checklistItems?: string[];
      checklistValues?: Record<string, string>;
      surveyData?: Record<string, unknown>;
      aiResult?: Record<string, unknown>;
      fullAiResult?: Record<string, unknown>;
    };
    const update: Partial<typeof landProspectsTable.$inferInsert> = {};
    if (checklistItems !== undefined) update.checklistItems = checklistItems;
    if (checklistValues !== undefined) update.checklistValues = checklistValues;
    if (surveyData !== undefined) update.surveyData = surveyData;
    if (aiResult !== undefined) update.aiResult = aiResult;
    if (fullAiResult !== undefined) update.fullAiResult = fullAiResult;
    const [row] = await db
      .update(landProspectsTable)
      .set(update)
      .where(eq(landProspectsTable.id, id))
      .returning({ id: landProspectsTable.id });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update acquisition data");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.post("/land-prospects/:id/promote", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [prospect] = await db.select().from(landProspectsTable).where(eq(landProspectsTable.id, id));
    if (!prospect) return res.status(404).json({ error: "Not found" });

    if (prospect.projectId) {
      const [existing] = await db.select().from(projectsTable).where(eq(projectsTable.id, prospect.projectId));
      return res.json({ projectId: prospect.projectId, isNew: false, projectNama: existing?.nama ?? "" });
    }

    const fullAi = prospect.fullAiResult as Record<string, unknown> | null;
    const calcUnit = ((fullAi?.calc as Record<string, unknown>)?.unitPotential as Record<string, unknown>) ?? {};
    const aiResult = prospect.aiResult as Record<string, unknown> | null;
    const potensiUnit = Math.round((calcUnit.unitRealistis as number) || (aiResult?.potensiUnit as number) || 0);

    const lokasiBagian = [prospect.kelurahan, prospect.kecamatan].filter(Boolean).join(", ");
    const projectNama = `Proyek ${lokasiBagian || prospect.lokasi}`;

    const [project] = await db.insert(projectsTable).values({
      nama: projectNama,
      lokasi: prospect.lokasi,
      kabupaten: prospect.kabupaten ?? undefined,
      kecamatan: prospect.kecamatan ?? undefined,
      desa: prospect.kelurahan ?? undefined,
      luas: prospect.luas ?? undefined,
      lat: prospect.lat ?? undefined,
      lng: prospect.lng ?? undefined,
      totalUnit: potensiUnit,
      fase: "PLAN",
      status: "active",
    }).returning();

    await db.update(landProspectsTable).set({ projectId: project.id }).where(eq(landProspectsTable.id, id));

    return res.json({ projectId: project.id, isNew: true, projectNama: project.nama });
  } catch (err) {
    req.log.error({ err }, "Failed to promote land prospect to project");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/land-prospects/:id", async (req, res) => {
  try {
    const [prospect] = await db.select().from(landProspectsTable).where(eq(landProspectsTable.id, parseInt(req.params.id)));
    if (!prospect) return res.status(404).json({ error: "Not found" });
    res.json({ ...prospect, createdAt: prospect.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to get land prospect");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/land-prospects/:id", async (req, res) => {
  try {
    const body = UpdateLandProspectBody.parse(req.body);
    const [prospect] = await db.update(landProspectsTable).set(body).where(eq(landProspectsTable.id, parseInt(req.params.id))).returning();
    if (!prospect) return res.status(404).json({ error: "Not found" });
    res.json({ ...prospect, createdAt: prospect.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update land prospect");
    res.status(400).json({ error: "Invalid request" });
  }
});

export default router;
