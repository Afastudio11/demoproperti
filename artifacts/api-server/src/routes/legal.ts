import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  legalDocumentsTable,
  permitDocumentsTable,
  permitStatusHistoryTable,
  landStagesTable,
  landLegalChecklistTable,
  shmSplitRecordsTable,
  legalIssuesTable,
  legalIssueHistoryTable,
  projectsTable,
  sp3kRecordsTable,
} from "@workspace/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

const router: IRouter = Router();

const BANKABLE_DOCS = ["SHM", "bank_ready", "sikumbang", "PBG"];

// ─── DEFAULT PERMITS ────────────────────────────────────────────────────────

const DEFAULT_PERMITS = [
  { group: "perizinan_dasar", name: "KKPR", institution: "Dinas PUPR / OSS" },
  { group: "perizinan_dasar", name: "SPPL/UKL-UPL/AMDAL", institution: "Dinas Lingkungan Hidup" },
  { group: "perizinan_bangunan", name: "Persetujuan Siteplan", institution: "Dinas PUPR" },
  { group: "perizinan_bangunan", name: "PBG", institution: "SIMBG" },
  { group: "perizinan_bangunan", name: "SLF", institution: "Dinas PUPR" },
  { group: "perizinan_bangunan", name: "Sikumbang", institution: "Kementerian PUPR" },
  { group: "izin_teknis", name: "Andalalin", institution: "Dinas Perhubungan" },
  { group: "izin_teknis", name: "SIPA", institution: "Balai Wilayah Sungai (BWS)" },
];

const DEFAULT_CHECKLIST = [
  "Survey Legal", "Cek SHM", "Negosiasi", "AJB", "Balik Nama", "Pemecahan SHM", "Pisah PBB",
];

const PIC_OPTIONS = ["UMMU", "DINDA", "NIA", "HIKMAH", "EKKY", "IRDA", "ANTI", "TAHIR", "ARYA"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function calcPermitReadiness(permits: typeof permitDocumentsTable.$inferSelect[]) {
  const active = permits.filter(p => p.status !== "tidak_diperlukan");
  if (active.length === 0) return 0;
  const done = active.filter(p => p.status === "selesai").length;
  return Math.round((done / active.length) * 100);
}

function calcLandReadiness(checklist: typeof landLegalChecklistTable.$inferSelect[]) {
  if (checklist.length === 0) return 0;
  const done = checklist.filter(c => c.status === "selesai").length;
  return Math.round((done / checklist.length) * 100);
}

function calcLegalRiskScore(issues: typeof legalIssuesTable.$inferSelect[]) {
  const activeIssues = issues.filter(i => i.status !== "selesai" && i.status !== "ditutup");
  const high = activeIssues.filter(i => i.riskLevel === "high").length;
  const medium = activeIssues.filter(i => i.riskLevel === "medium").length;
  const low = activeIssues.filter(i => i.riskLevel === "low").length;
  return Math.max(0, 100 - (high * 15) - (medium * 5) - (low * 1));
}

// ─── LEGACY LEGAL DOCUMENTS ─────────────────────────────────────────────────

router.get("/legal", async (req, res) => {
  try {
    let docs = await db.select().from(legalDocumentsTable);
    if (req.query.projectId) {
      const pid = parseInt(req.query.projectId as string);
      docs = docs.filter(d => d.projectId === pid);
    }
    res.json(docs.map(d => ({ ...d, pic: d.pic ?? null, expiry: d.expiry ?? null, catatan: d.catatan ?? null, createdAt: d.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list legal documents");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/legal", async (req, res) => {
  try {
    const { projectId, tipeDokumen, status, pic, expiry, catatan } = req.body;
    const [doc] = await db.insert(legalDocumentsTable).values({ projectId, tipeDokumen, status: status ?? "pending", pic, expiry, catatan }).returning();
    res.status(201).json({ ...doc, pic: doc.pic ?? null, expiry: doc.expiry ?? null, catatan: doc.catatan ?? null, createdAt: doc.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create legal document");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.patch("/legal/:id", async (req, res) => {
  try {
    const { status, pic, expiry, catatan } = req.body;
    const update: any = {};
    if (status !== undefined) update.status = status;
    if (pic !== undefined) update.pic = pic;
    if (expiry !== undefined) update.expiry = expiry;
    if (catatan !== undefined) update.catatan = catatan;
    const [doc] = await db.update(legalDocumentsTable).set(update).where(eq(legalDocumentsTable.id, parseInt(req.params.id))).returning();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ ...doc, pic: doc.pic ?? null, expiry: doc.expiry ?? null, catatan: doc.catatan ?? null, createdAt: doc.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update legal document");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.get("/legal/bankable-gate/:projectId", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const docs = await db.select().from(legalDocumentsTable).where(eq(legalDocumentsTable.projectId, projectId));
    const checks = BANKABLE_DOCS.map(docType => {
      const doc = docs.find(d => d.tipeDokumen === docType);
      return {
        name: docType,
        status: !doc ? "red" : doc.status === "approved" ? "green" : doc.status === "in_progress" ? "yellow" : "red",
        notes: doc?.catatan ?? null,
      };
    });
    const isBankable = checks.every(c => c.status === "green");
    res.json({ projectId, isBankable, checks });
  } catch (err) {
    req.log.error({ err }, "Failed to get bankable gate");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── LEGAL DASHBOARD ─────────────────────────────────────────────────────────

router.get("/legal/dashboard", async (req, res) => {
  try {
    const projects = await db.select().from(projectsTable).where(eq(projectsTable.status, "active"));
    const permits = await db.select().from(permitDocumentsTable);
    const landStages = await db.select().from(landStagesTable);
    const checklist = await db.select().from(landLegalChecklistTable);
    const shmRecords = await db.select().from(shmSplitRecordsTable);
    const issues = await db.select().from(legalIssuesTable);

    const projectReadiness = projects.map(p => {
      const projectPermits = permits.filter(pm => pm.projectId === p.id);
      const projectStages = landStages.filter(s => s.projectId === p.id);
      const projectChecklist = checklist.filter(c => projectStages.some(s => s.id === c.landStageId));
      const projectShm = shmRecords.filter(s => s.projectId === p.id);

      const permitReadiness = calcPermitReadiness(projectPermits);
      const landReadiness = projectStages.length > 0
        ? Math.round(projectStages.reduce((sum, stage) => {
            const sc = checklist.filter(c => c.landStageId === stage.id);
            return sum + calcLandReadiness(sc);
          }, 0) / projectStages.length)
        : 0;

      const totalTarget = projectShm.reduce((s, r) => s + r.targetSplit, 0);
      const totalRealized = projectShm.reduce((s, r) => s + r.realizedSplit, 0);
      const shmReadiness = totalTarget > 0 ? Math.round((totalRealized / totalTarget) * 100) : 0;

      const parts = [permitReadiness, landReadiness, shmReadiness].filter((_, i) => {
        if (i === 0) return projectPermits.length > 0;
        if (i === 1) return projectStages.length > 0;
        return totalTarget > 0;
      });
      const legalReadiness = parts.length > 0 ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0;

      const projectIssues = issues.filter(i => i.projectId === p.id && i.status !== "selesai" && i.status !== "ditutup");

      return {
        projectId: p.id,
        projectName: p.nama,
        legalReadiness,
        permitReadiness,
        landReadiness,
        shmReadiness,
        issueCount: projectIssues.length,
        riskLevel: projectIssues.some(i => i.riskLevel === "high") ? "high" : projectIssues.some(i => i.riskLevel === "medium") ? "medium" : "low",
      };
    });

    const activeProjects = projectReadiness.filter(p => p.legalReadiness > 0 || p.issueCount > 0);
    const avgLegalReadiness = activeProjects.length > 0
      ? Math.round(activeProjects.reduce((s, p) => s + p.legalReadiness, 0) / activeProjects.length)
      : Math.round(projectReadiness.reduce((s, p) => s + p.legalReadiness, 0) / Math.max(1, projectReadiness.length));
    const avgPermitReadiness = projectReadiness.length > 0
      ? Math.round(projectReadiness.reduce((s, p) => s + p.permitReadiness, 0) / projectReadiness.length)
      : 0;

    const totalShmTarget = shmRecords.reduce((s, r) => s + r.targetSplit, 0);
    const totalShmRealized = shmRecords.reduce((s, r) => s + r.realizedSplit, 0);
    const overallShmReadiness = totalShmTarget > 0 ? Math.round((totalShmRealized / totalShmTarget) * 100) : 0;
    const legalRiskScore = calcLegalRiskScore(issues);

    // Permit matrix
    const permitMatrix: Record<string, Record<string, string>> = {};
    DEFAULT_PERMITS.forEach(dp => {
      permitMatrix[dp.name] = {};
      projects.forEach(p => {
        const pm = permits.find(pm => pm.projectId === p.id && pm.permitName === dp.name);
        permitMatrix[dp.name][p.id] = pm?.status ?? "belum_diajukan";
      });
    });

    // SHM summary
    const shmByProject: Record<number, { stages: any[]; total: { target: number; realized: number } }> = {};
    projects.forEach(p => {
      const records = shmRecords.filter(r => r.projectId === p.id);
      shmByProject[p.id] = {
        stages: records.map(r => ({
          stageCode: r.stageCode,
          targetSplit: r.targetSplit,
          realizedSplit: r.realizedSplit,
          sisa: r.targetSplit - r.realizedSplit,
          progress: r.targetSplit > 0 ? Math.round((r.realizedSplit / r.targetSplit) * 100) : 0,
        })),
        total: {
          target: records.reduce((s, r) => s + r.targetSplit, 0),
          realized: records.reduce((s, r) => s + r.realizedSplit, 0),
        },
      };
    });

    // Land readiness per stage (all projects)
    const landReadinessByStage = landStages.map(stage => {
      const sc = checklist.filter(c => c.landStageId === stage.id);
      const progress = calcLandReadiness(sc);
      const proj = projects.find(p => p.id === stage.projectId);
      const bottleneck = sc.find(c => c.status !== "selesai");
      return {
        projectName: proj?.nama ?? "Unknown",
        stageCode: stage.stageCode,
        stageIdentity: stage.stageIdentity,
        stageStatus: stage.stageStatus,
        progress,
        bottleneck: bottleneck?.itemName ?? null,
      };
    });

    // Alerts
    const alerts: any[] = [];
    landStages.forEach(stage => {
      const sc = checklist.filter(c => c.landStageId === stage.id);
      const stuck = sc.find(c => c.status !== "selesai" && c.targetDate && new Date(c.targetDate) < new Date());
      if (stuck) {
        const proj = projects.find(p => p.id === stage.projectId);
        const daysLate = Math.floor((Date.now() - new Date(stuck.targetDate!).getTime()) / 86400000);
        alerts.push({ level: "warning", message: `${proj?.nama} Tahap ${stage.stageCode} — ${stuck.itemName} terlambat ${daysLate} hari` });
      }
    });
    shmRecords.filter(r => r.targetSplit - r.realizedSplit > 0 && r.realizedSplit === 0).forEach(r => {
      const proj = projects.find(p => p.id === r.projectId);
      alerts.push({ level: "warning", message: `${proj?.nama} Tahap ${r.stageCode} — Pemecahan SHM tertinggal ${r.targetSplit} bidang` });
    });
    issues.filter(i => i.status !== "selesai" && i.status !== "ditutup" && i.riskLevel === "high").forEach(i => {
      const proj = projects.find(p => p.id === i.projectId);
      alerts.push({ level: "kritis", message: `${proj?.nama ?? "Lintas Proyek"} — ${i.title} (High Risk, ${i.status})` });
    });

    res.json({
      metrics: { avgLegalReadiness, avgPermitReadiness, overallShmReadiness, legalRiskScore },
      projectReadiness,
      permitMatrix,
      projects: projects.map(p => ({ id: p.id, name: p.nama })),
      landReadinessByStage,
      shmByProject,
      alerts,
      issuesSummary: projectReadiness.map(p => ({ projectName: p.projectName, riskLevel: p.riskLevel, issueCount: p.issueCount })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get legal dashboard");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PERMIT DOCUMENTS ────────────────────────────────────────────────────────

router.get("/legal/permits", async (req, res) => {
  try {
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : null;
    const projects = await db.select().from(projectsTable);

    if (projectId) {
      let permits = await db.select().from(permitDocumentsTable).where(eq(permitDocumentsTable.projectId, projectId));
      // Seed defaults jika belum ada
      if (permits.length === 0) {
        const defaultValues = DEFAULT_PERMITS.map(dp => ({ projectId, permitGroup: dp.group, permitName: dp.name, institution: dp.institution }));
        await db.insert(permitDocumentsTable).values(defaultValues);
        permits = await db.select().from(permitDocumentsTable).where(eq(permitDocumentsTable.projectId, projectId));
      }
      const readiness = calcPermitReadiness(permits);
      res.json({ permits, readiness, project: projects.find(p => p.id === projectId) });
    } else {
      const permits = await db.select().from(permitDocumentsTable);
      res.json({ permits, projects });
    }
  } catch (err) {
    req.log.error({ err }, "Failed to list permits");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/legal/permits/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, submissionDate, targetDate, actualDate, documentNumber, pic, institution, notes, fileUrl } = req.body;
    const existing = await db.select().from(permitDocumentsTable).where(eq(permitDocumentsTable.id, id));
    if (!existing[0]) return res.status(404).json({ error: "Not found" });

    const update: any = {};
    if (status !== undefined) update.status = status;
    if (submissionDate !== undefined) update.submissionDate = submissionDate || null;
    if (targetDate !== undefined) update.targetDate = targetDate || null;
    if (actualDate !== undefined) update.actualDate = actualDate || null;
    if (documentNumber !== undefined) update.documentNumber = documentNumber;
    if (pic !== undefined) update.pic = pic;
    if (institution !== undefined) update.institution = institution;
    if (notes !== undefined) update.notes = notes;
    if (fileUrl !== undefined) update.fileUrl = fileUrl;

    const [updated] = await db.update(permitDocumentsTable).set(update).where(eq(permitDocumentsTable.id, id)).returning();

    if (status && status !== existing[0].status) {
      await db.insert(permitStatusHistoryTable).values({ permitId: id, fromStatus: existing[0].status, toStatus: status });
    }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update permit");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.post("/legal/permits", async (req, res) => {
  try {
    const { projectId, permitGroup, permitName, institution, status, submissionDate, targetDate, actualDate, documentNumber, pic, notes } = req.body;
    const [doc] = await db.insert(permitDocumentsTable).values({ projectId, permitGroup, permitName, institution, status: status ?? "belum_diajukan", submissionDate: submissionDate || null, targetDate: targetDate || null, actualDate: actualDate || null, documentNumber, pic, notes }).returning();
    res.status(201).json(doc);
  } catch (err) {
    req.log.error({ err }, "Failed to create permit");
    res.status(400).json({ error: "Invalid request" });
  }
});

// ─── LAND STAGES ─────────────────────────────────────────────────────────────

router.get("/legal/land-stages", async (req, res) => {
  try {
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : null;

    const stagesQuery = projectId
      ? db.select().from(landStagesTable).where(eq(landStagesTable.projectId, projectId)).orderBy(landStagesTable.stageCode)
      : db.select().from(landStagesTable).orderBy(landStagesTable.projectId, landStagesTable.stageCode);

    const stages = await stagesQuery;
    const checklist = await db.select().from(landLegalChecklistTable);
    const projects = await db.select().from(projectsTable);

    const result = stages.map(stage => {
      const sc = checklist.filter(c => c.landStageId === stage.id);
      const progress = calcLandReadiness(sc);
      const proj = projects.find(p => p.id === stage.projectId);
      return { ...stage, checklist: sc, progress, projectName: proj?.nama ?? "Unknown" };
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list land stages");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/legal/land-stages/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [stage] = await db.select().from(landStagesTable).where(eq(landStagesTable.id, id));
    if (!stage) return res.status(404).json({ error: "Not found" });
    const sc = await db.select().from(landLegalChecklistTable).where(eq(landLegalChecklistTable.landStageId, id)).orderBy(landLegalChecklistTable.itemOrder);
    const proj = await db.select().from(projectsTable).where(eq(projectsTable.id, stage.projectId));
    res.json({ ...stage, checklist: sc, progress: calcLandReadiness(sc), projectName: proj[0]?.nama });
  } catch (err) {
    req.log.error({ err }, "Failed to get land stage");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/legal/land-stages", async (req, res) => {
  try {
    const { projectId, stageCode, stageIdentity, landArea, targetKavlings, certificateNumber, stageStatus, notes } = req.body;
    const [stage] = await db.insert(landStagesTable).values({ projectId, stageCode, stageIdentity, landArea: landArea || null, targetKavlings: targetKavlings || null, certificateNumber, stageStatus: stageStatus ?? "belum_mulai", notes }).returning();

    // Buat checklist default
    const checklistValues = DEFAULT_CHECKLIST.map((item, i) => ({ landStageId: stage.id, itemName: item, itemOrder: i + 1 }));
    const sc = await db.insert(landLegalChecklistTable).values(checklistValues).returning();
    res.status(201).json({ ...stage, checklist: sc, progress: 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to create land stage");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.patch("/legal/land-stages/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { stageStatus, stageIdentity, landArea, targetKavlings, certificateNumber, notes } = req.body;
    const update: any = {};
    if (stageStatus !== undefined) update.stageStatus = stageStatus;
    if (stageIdentity !== undefined) update.stageIdentity = stageIdentity;
    if (landArea !== undefined) update.landArea = landArea;
    if (targetKavlings !== undefined) update.targetKavlings = targetKavlings;
    if (certificateNumber !== undefined) update.certificateNumber = certificateNumber;
    if (notes !== undefined) update.notes = notes;
    const [updated] = await db.update(landStagesTable).set(update).where(eq(landStagesTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update land stage");
    res.status(400).json({ error: "Invalid request" });
  }
});

// ─── LAND CHECKLIST ──────────────────────────────────────────────────────────

router.patch("/legal/land-checklist/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, submissionDate, targetDate, actualDate, pic, notes } = req.body;
    const update: any = { updatedAt: new Date() };
    if (status !== undefined) update.status = status;
    if (submissionDate !== undefined) update.submissionDate = submissionDate || null;
    if (targetDate !== undefined) update.targetDate = targetDate || null;
    if (actualDate !== undefined) update.actualDate = actualDate || null;
    if (pic !== undefined) update.pic = pic;
    if (notes !== undefined) update.notes = notes;
    const [updated] = await db.update(landLegalChecklistTable).set(update).where(eq(landLegalChecklistTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update checklist item");
    res.status(400).json({ error: "Invalid request" });
  }
});

// ─── SHM SPLIT ───────────────────────────────────────────────────────────────

router.get("/legal/shm-splits", async (req, res) => {
  try {
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : null;
    const records = projectId
      ? await db.select().from(shmSplitRecordsTable).where(eq(shmSplitRecordsTable.projectId, projectId)).orderBy(shmSplitRecordsTable.stageCode)
      : await db.select().from(shmSplitRecordsTable).orderBy(shmSplitRecordsTable.projectId, shmSplitRecordsTable.stageCode);
    const projects = await db.select().from(projectsTable);

    const result = records.map(r => ({
      ...r,
      sisa: r.targetSplit - r.realizedSplit,
      progress: r.targetSplit > 0 ? Math.round((r.realizedSplit / r.targetSplit) * 100) : 0,
      projectName: projects.find(p => p.id === r.projectId)?.nama ?? "Unknown",
    }));

    const totals = {
      target: records.reduce((s, r) => s + r.targetSplit, 0),
      realized: records.reduce((s, r) => s + r.realizedSplit, 0),
    };

    res.json({ records: result, totals, projects });
  } catch (err) {
    req.log.error({ err }, "Failed to get SHM splits");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/legal/shm-splits", async (req, res) => {
  try {
    const { projectId, stageCode, landStageId, targetSplit, realizedSplit, lastUpdated, pic, notes } = req.body;
    const [record] = await db.insert(shmSplitRecordsTable).values({ projectId, stageCode, landStageId: landStageId || null, targetSplit: targetSplit ?? 0, realizedSplit: realizedSplit ?? 0, lastUpdated: lastUpdated || null, pic, notes }).returning();
    res.status(201).json(record);
  } catch (err) {
    req.log.error({ err }, "Failed to create SHM split");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.patch("/legal/shm-splits/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { targetSplit, realizedSplit, lastUpdated, pic, notes } = req.body;
    const update: any = {};
    if (targetSplit !== undefined) update.targetSplit = targetSplit;
    if (realizedSplit !== undefined) update.realizedSplit = realizedSplit;
    if (lastUpdated !== undefined) update.lastUpdated = lastUpdated || null;
    if (pic !== undefined) update.pic = pic;
    if (notes !== undefined) update.notes = notes;
    const [updated] = await db.update(shmSplitRecordsTable).set(update).where(eq(shmSplitRecordsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...updated, sisa: updated.targetSplit - updated.realizedSplit, progress: updated.targetSplit > 0 ? Math.round((updated.realizedSplit / updated.targetSplit) * 100) : 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to update SHM split");
    res.status(400).json({ error: "Invalid request" });
  }
});

// ─── LEGAL ISSUES ─────────────────────────────────────────────────────────────

router.get("/legal/issues", async (req, res) => {
  try {
    const issues = await db.select().from(legalIssuesTable).orderBy(desc(legalIssuesTable.createdAt));
    const projects = await db.select().from(projectsTable);

    const result = issues.map(i => {
      const proj = projects.find(p => p.id === i.projectId);
      const days = i.startDate ? Math.floor((Date.now() - new Date(i.startDate).getTime()) / 86400000) : 0;
      return { ...i, projectName: proj?.nama ?? "Lintas Proyek", daysRunning: days };
    });
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list issues");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/legal/issues", async (req, res) => {
  try {
    const { projectId, title, objectDescription, category, riskLevel, description, status, pic, startDate, targetResolution, completedDate } = req.body;
    const [issue] = await db.insert(legalIssuesTable).values({ projectId: projectId || null, title, objectDescription, category: category ?? "lainnya", riskLevel: riskLevel ?? "low", description, status: status ?? "aktif", pic, startDate: startDate || null, targetResolution: targetResolution || null, completedDate: completedDate || null }).returning();
    res.status(201).json(issue);
  } catch (err) {
    req.log.error({ err }, "Failed to create issue");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.patch("/legal/issues/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await db.select().from(legalIssuesTable).where(eq(legalIssuesTable.id, id));
    if (!existing[0]) { res.status(404).json({ error: "Not found" }); return; }

    const { status, riskLevel, pic, targetResolution, completedDate, description } = req.body;
    const update: any = {};
    if (status !== undefined) update.status = status;
    if (riskLevel !== undefined) update.riskLevel = riskLevel;
    if (pic !== undefined) update.pic = pic;
    if (targetResolution !== undefined) update.targetResolution = targetResolution || null;
    if (completedDate !== undefined) update.completedDate = completedDate || null;
    if (description !== undefined) update.description = description;

    const [updated] = await db.update(legalIssuesTable).set(update).where(eq(legalIssuesTable.id, id)).returning();

    if (status && status !== existing[0].status) {
      await db.insert(legalIssueHistoryTable).values({ issueId: id, fromStatus: existing[0].status, toStatus: status });
    }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update issue");
    res.status(400).json({ error: "Invalid request" });
  }
});

// ─── LEGAL SEED ──────────────────────────────────────────────────────────────

router.post("/legal/seed", async (req, res) => {
  try {
    const projects = await db.select().from(projectsTable);
    const sn3 = projects.find(p => p.nama.toLowerCase().includes("sn") && p.nama.includes("3"));
    const sn1 = projects.find(p => p.nama.toLowerCase().includes("sn") && p.nama.includes("1"));
    const sn4 = projects.find(p => p.nama.toLowerCase().includes("sn") && p.nama.includes("4"));
    const hills = projects.find(p => p.nama.toLowerCase().includes("hills") || p.nama.toLowerCase().includes("mangngarabe"));

    // SHM splits for SN3
    if (sn3) {
      const existing = await db.select().from(shmSplitRecordsTable).where(eq(shmSplitRecordsTable.projectId, sn3.id));
      if (existing.length === 0) {
        await db.insert(shmSplitRecordsTable).values([
          { projectId: sn3.id, stageCode: "T1", targetSplit: 48, realizedSplit: 48 },
          { projectId: sn3.id, stageCode: "T2", targetSplit: 29, realizedSplit: 29 },
          { projectId: sn3.id, stageCode: "T3", targetSplit: 36, realizedSplit: 20 },
          { projectId: sn3.id, stageCode: "T4", targetSplit: 32, realizedSplit: 0 },
          { projectId: sn3.id, stageCode: "T5", targetSplit: 44, realizedSplit: 0 },
        ]);
      }

      // Land stages for SN3
      const existingStages = await db.select().from(landStagesTable).where(eq(landStagesTable.projectId, sn3.id));
      if (existingStages.length === 0) {
        const stageData = [
          { stageCode: "T1", stageIdentity: "H. Ani", stageStatus: "selesai" },
          { stageCode: "T2", stageIdentity: "Pak Anas", stageStatus: "selesai" },
          { stageCode: "T5", stageIdentity: "Dg. Ari", stageStatus: "negosiasi" },
        ];
        for (const sd of stageData) {
          const [stage] = await db.insert(landStagesTable).values({ projectId: sn3.id, ...sd }).returning();
          const checklistMap: Record<string, Record<string, string>> = {
            T1: { "Survey Legal": "selesai", "Cek SHM": "selesai", "Negosiasi": "selesai", "AJB": "selesai", "Balik Nama": "selesai", "Pemecahan SHM": "selesai", "Pisah PBB": "selesai" },
            T2: { "Survey Legal": "selesai", "Cek SHM": "selesai", "Negosiasi": "selesai", "AJB": "selesai", "Balik Nama": "selesai", "Pemecahan SHM": "belum", "Pisah PBB": "belum" },
            T5: { "Survey Legal": "selesai", "Cek SHM": "selesai", "Negosiasi": "selesai", "AJB": "belum", "Balik Nama": "belum", "Pemecahan SHM": "belum", "Pisah PBB": "belum" },
          };
          const cm = checklistMap[sd.stageCode] ?? {};
          await db.insert(landLegalChecklistTable).values(DEFAULT_CHECKLIST.map((item, i) => ({
            landStageId: stage.id, itemName: item, itemOrder: i + 1, status: cm[item] ?? "belum",
          })));
        }
      }
    }

    // Legal issues seed
    const existingIssues = await db.select().from(legalIssuesTable);
    if (existingIssues.length === 0) {
      await db.insert(legalIssuesTable).values([
        { title: "Rumah Bernyanyi", objectDescription: "SHM", category: "masalah_shm", riskLevel: "high", status: "sidang", startDate: "2024-06-01" },
        { projectId: sn3?.id ?? null, title: "Sengketa Batas Tahap 5", objectDescription: "Tahap 5", category: "sengketa_batas", riskLevel: "medium", status: "mediasi", startDate: "2024-09-15" },
      ]);
    }

    res.json({ success: true, message: "Seed data legal berhasil diinput" });
  } catch (err) {
    req.log.error({ err }, "Failed to seed legal data");
    res.status(500).json({ error: String(err) });
  }
});

export default router;
