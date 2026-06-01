import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  projectsTable, unitsTable, landProspectsTable, legalDocumentsTable,
  leadsTable, customersTable, constructionTasksTable
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateProjectBody, UpdateProjectBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projects", async (req, res) => {
  try {
    const projects = await db.select().from(projectsTable);
    res.json(projects.map(p => ({
      ...p,
      targetStart: p.targetStart ?? null,
      targetEnd: p.targetEnd ?? null,
      lat: p.lat ?? null,
      lng: p.lng ?? null,
      provinsi: p.provinsi ?? null,
      kabupaten: p.kabupaten ?? null,
      kecamatan: p.kecamatan ?? null,
      desa: p.desa ?? null,
      luas: p.luas ?? null,
      createdAt: p.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list projects");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/projects", async (req, res) => {
  try {
    const body = CreateProjectBody.parse(req.body);
    const [project] = await db.insert(projectsTable).values(body).returning();
    res.status(201).json({
      ...project,
      targetStart: project.targetStart ?? null,
      targetEnd: project.targetEnd ?? null,
      lat: project.lat ?? null,
      lng: project.lng ?? null,
      provinsi: project.provinsi ?? null,
      kabupaten: project.kabupaten ?? null,
      kecamatan: project.kecamatan ?? null,
      desa: project.desa ?? null,
      luas: project.luas ?? null,
      createdAt: project.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create project");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.get("/projects/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
    if (!project) return res.status(404).json({ error: "Not found" });

    const [units, landProspects, legalDocuments] = await Promise.all([
      db.select().from(unitsTable).where(eq(unitsTable.projectId, id)),
      db.select().from(landProspectsTable).where(eq(landProspectsTable.projectId, id)),
      db.select().from(legalDocumentsTable).where(eq(legalDocumentsTable.projectId, id)),
    ]);

    res.json({
      ...project,
      targetStart: project.targetStart ?? null,
      targetEnd: project.targetEnd ?? null,
      lat: project.lat ?? null,
      lng: project.lng ?? null,
      provinsi: project.provinsi ?? null,
      kabupaten: project.kabupaten ?? null,
      kecamatan: project.kecamatan ?? null,
      desa: project.desa ?? null,
      luas: project.luas ?? null,
      createdAt: project.createdAt.toISOString(),
      units: units.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })),
      landProspects: landProspects.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })),
      legalDocuments: legalDocuments.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get project");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/projects/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = UpdateProjectBody.parse(req.body);
    const [project] = await db.update(projectsTable).set(body).where(eq(projectsTable.id, id)).returning();
    if (!project) return res.status(404).json({ error: "Not found" });
    res.json({
      ...project,
      targetStart: project.targetStart ?? null,
      targetEnd: project.targetEnd ?? null,
      lat: project.lat ?? null,
      lng: project.lng ?? null,
      provinsi: project.provinsi ?? null,
      kabupaten: project.kabupaten ?? null,
      kecamatan: project.kecamatan ?? null,
      desa: project.desa ?? null,
      luas: project.luas ?? null,
      createdAt: project.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update project");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.get("/projects/:id/health", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
    if (!project) return res.status(404).json({ error: "Not found" });

    const [units, leads, legalDocs] = await Promise.all([
      db.select().from(unitsTable).where(eq(unitsTable.projectId, id)),
      db.select().from(leadsTable).where(eq(leadsTable.projectId, id)),
      db.select().from(legalDocumentsTable).where(eq(legalDocumentsTable.projectId, id)),
    ]);

    const soldUnits = units.filter(u => u.status !== "available").length;
    const salesProgress = units.length > 0 ? (soldUnits / units.length) * 100 : 0;
    const akadUnits = units.filter(u => u.status === "akad" || u.status === "serah_terima").length;
    const akadProgress = units.length > 0 ? (akadUnits / units.length) * 100 : 0;
    const avgProgress = units.length > 0
      ? units.reduce((s, u) => s + (u.progress || 0), 0) / units.length
      : 0;

    const alerts: string[] = [];
    const pendingDocs = legalDocs.filter(d => d.status === "pending").length;
    if (pendingDocs > 0) alerts.push(`${pendingDocs} dokumen legal pending`);

    const riskLevel = alerts.length > 2 ? "red" : alerts.length > 0 ? "yellow" : "green";

    res.json({
      projectId: id,
      riskLevel,
      salesProgress: Math.round(salesProgress * 10) / 10,
      akadProgress: Math.round(akadProgress * 10) / 10,
      constructionProgress: Math.round(avgProgress * 10) / 10,
      cashflowStatus: "positif",
      alerts,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get project health");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
