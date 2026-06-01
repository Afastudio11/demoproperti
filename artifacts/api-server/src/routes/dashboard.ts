import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  projectsTable, landProspectsTable, feasibilityStudiesTable,
  legalDocumentsTable, leadsTable, customersTable, unitsTable,
  constructionTasksTable, qcDefectsTable, materialsTable, handoversTable
} from "@workspace/db";
import { eq, sql, lt } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const [projects, units, leads, customers] = await Promise.all([
      db.select().from(projectsTable),
      db.select().from(unitsTable),
      db.select().from(leadsTable),
      db.select().from(customersTable),
    ]);

    const activePhases = projects.reduce((acc: Record<string, number>, p) => {
      acc[p.fase] = (acc[p.fase] || 0) + 1;
      return acc;
    }, {});

    const totalProgress = units.length > 0
      ? units.reduce((sum, u) => sum + (u.progress || 0), 0) / units.length
      : 0;

    const projectsAtRisk = projects.filter(p => p.status === "on_hold").length;

    res.json({
      totalProjects: projects.length,
      totalUnits: units.length,
      totalLeads: leads.length,
      totalCustomers: customers.length,
      activePhases: Object.entries(activePhases).map(([phase, count]) => ({ phase, count })),
      overallProgress: Math.round(totalProgress * 10) / 10,
      projectsAtRisk,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/kpi", async (req, res) => {
  try {
    const [leads, customers, units, legalDocs, landProspects] = await Promise.all([
      db.select().from(leadsTable),
      db.select().from(customersTable),
      db.select().from(unitsTable),
      db.select().from(legalDocumentsTable),
      db.select().from(landProspectsTable),
    ]);

    const totalLeads = leads.length;
    const bookings = leads.filter(l => l.status === "booking").length;
    const akad = leads.filter(l => l.status === "akad").length;
    const conversionRate = totalLeads > 0 ? (bookings / totalLeads) * 100 : 0;
    const bookingToAkad = bookings > 0 ? (akad / bookings) * 100 : 0;

    const pendingBerkas = customers.filter(c => !c.berkasLengkap).length;
    const sp3kCount = customers.filter(c => c.statusKpr === "sp3k").length;
    const akadCount = customers.filter(c => c.statusKpr === "akad").length;
    const rejectedCustomers = customers.filter(c => c.statusKpr === "ditolak").length;
    const rejectRate = customers.length > 0 ? (rejectedCustomers / customers.length) * 100 : 0;

    const avgProgress = units.length > 0
      ? units.reduce((s, u) => s + (u.progress || 0), 0) / units.length
      : 0;
    const readyAkad = units.filter(u => u.readyAkad).length;

    const approvedDocs = legalDocs.filter(d => d.status === "approved").length;
    const pendingDocs = legalDocs.filter(d => d.status === "pending" || d.status === "in_progress").length;

    const avgRoi = landProspects.length > 0
      ? landProspects.reduce((s, p) => s + (p.roi || 0), 0) / landProspects.length
      : 0;
    const legalCleanProspects = landProspects.filter(p => p.riskLevel === "green").length;
    const legalCleanRate = landProspects.length > 0 ? (legalCleanProspects / landProspects.length) * 100 : 0;

    res.json({
      marketing: { leads: totalLeads, cpl: 250000, conversionRate: Math.round(conversionRate * 10) / 10, bookingToAkad: Math.round(bookingToAkad * 10) / 10 },
      admin: { pendingBerkas, sp3kCount, akadCount, rejectRate: Math.round(rejectRate * 10) / 10 },
      production: { avgProgress: Math.round(avgProgress * 10) / 10, deviation: 2.3, defectRate: 3.1, readyAkad },
      legal: { totalDocs: legalDocs.length, approved: approvedDocs, pending: pendingDocs, bankableProjects: 2 },
      acquisition: { prospects: landProspects.length, avgRoi: Math.round(avgRoi * 10) / 10, legalCleanRate: Math.round(legalCleanRate * 10) / 10 },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get KPI");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/cashflow", async (_req, res) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"];
  const forecast = months.map((month, i) => ({
    month,
    income: 1500000000 + (i * 200000000),
    expense: 900000000 + (i * 150000000),
  }));
  res.json({
    totalIncome: 8500000000,
    totalExpense: 5200000000,
    netCashflow: 3300000000,
    forecast,
  });
});

router.get("/dashboard/alerts", async (req, res) => {
  try {
    const projects = await db.select().from(projectsTable);
    const alerts: Array<{id: number; type: string; level: string; message: string; projectId: number; projectName: string; createdAt: string}> = [];
    let alertId = 1;

    for (const project of projects) {
      const [materials, units, legalDocs] = await Promise.all([
        db.select().from(materialsTable).where(eq(materialsTable.projectId, project.id)),
        db.select().from(unitsTable).where(eq(unitsTable.projectId, project.id)),
        db.select().from(legalDocumentsTable).where(eq(legalDocumentsTable.projectId, project.id)),
      ]);

      const belowMin = materials.filter(m => m.stok < m.minimumStock);
      if (belowMin.length > 0) {
        alerts.push({
          id: alertId++, type: "material", level: "red",
          message: `${belowMin.length} material stok kritis di bawah minimum`,
          projectId: project.id, projectName: project.nama,
          createdAt: new Date().toISOString(),
        });
      }

      const legalPending = legalDocs.filter(d => d.status === "pending").length;
      if (legalPending > 0) {
        alerts.push({
          id: alertId++, type: "legal", level: "yellow",
          message: `${legalPending} dokumen legal belum diproses`,
          projectId: project.id, projectName: project.nama,
          createdAt: new Date().toISOString(),
        });
      }
    }

    res.json(alerts);
  } catch (err) {
    req.log.error({ err }, "Failed to get alerts");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
