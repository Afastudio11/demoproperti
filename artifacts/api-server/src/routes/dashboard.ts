import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  projectsTable, landProspectsTable, feasibilityStudiesTable,
  legalDocumentsTable, leadsTable, customersTable, unitsTable,
  constructionTasksTable, qcDefectsTable, handoversTable,
  cashflowRecordsTable, prodMaterialMasterTable, prodMaterialInTable, prodMaterialOutTable,
  campaignsTable
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
    const [leads, customers, units, legalDocs, landProspects, qcDefects, campaigns] = await Promise.all([
      db.select().from(leadsTable),
      db.select().from(customersTable),
      db.select().from(unitsTable),
      db.select().from(legalDocumentsTable),
      db.select().from(landProspectsTable),
      db.select().from(qcDefectsTable),
      db.select().from(campaignsTable),
    ]);

    const totalLeads = leads.length;
    const bookings = leads.filter(l => l.status === "BOOKING").length;
    const akad = customers.filter(c => c.pipelineStatus === "AKAD" || c.pipelineStatus === "HT_CAIR").length;
    const conversionRate = totalLeads > 0 ? (bookings / totalLeads) * 100 : 0;
    const bookingToAkad = bookings > 0 ? (akad / bookings) * 100 : 0;

    const totalSpend = campaigns.reduce((sum, c) => sum + (c.spend ? Number(c.spend) : 0), 0);
    const totalLeadsGenerated = campaigns.reduce((sum, c) => sum + (c.leadsGenerated || 0), 0);
    const cpl = totalLeadsGenerated > 0 ? Math.round(totalSpend / totalLeadsGenerated) : 0;

    const pendingBerkas = customers.filter(c => !c.berkasLengkap).length;
    const sp3kCount = customers.filter(c => c.pipelineStatus === "SP3K").length;
    const akadCount = customers.filter(c => c.pipelineStatus === "AKAD" || c.pipelineStatus === "HT_CAIR").length;
    const rejectedCustomers = customers.filter(c => c.statusKpr === "ditolak" || c.pipelineStatus === "BATAL").length;
    const rejectRate = customers.length > 0 ? (rejectedCustomers / customers.length) * 100 : 0;

    const avgProgress = units.length > 0
      ? units.reduce((s, u) => s + (u.progress || 0), 0) / units.length
      : 0;
    const readyAkad = units.filter(u => u.readyAkad).length;

    // Deviation: perbedaan antara target (100%) dan progress rata-rata
    const deviation = units.length > 0 ? Math.round((100 - avgProgress) * 10) / 10 : 0;

    // Defect rate: persentase unit yang punya defect dari total unit
    const unitsWithDefect = new Set(qcDefects.map(d => d.unitId)).size;
    const defectRate = units.length > 0 ? Math.round((unitsWithDefect / units.length) * 1000) / 10 : 0;

    const approvedDocs = legalDocs.filter(d => d.status === "approved").length;
    const pendingDocs = legalDocs.filter(d => d.status === "pending" || d.status === "in_progress").length;

    // Bankable projects: proyek yang semua dokumen legal-nya approved
    const projectLegalMap: Record<number, { total: number; approved: number }> = {};
    for (const d of legalDocs) {
      if (!projectLegalMap[d.projectId]) projectLegalMap[d.projectId] = { total: 0, approved: 0 };
      projectLegalMap[d.projectId].total++;
      if (d.status === "approved") projectLegalMap[d.projectId].approved++;
    }
    const bankableProjects = Object.values(projectLegalMap).filter(p => p.total > 0 && p.approved === p.total).length;

    const avgRoi = landProspects.length > 0
      ? landProspects.reduce((s, p) => s + (p.roi || 0), 0) / landProspects.length
      : 0;
    const legalCleanProspects = landProspects.filter(p => p.riskLevel === "green").length;
    const legalCleanRate = landProspects.length > 0 ? (legalCleanProspects / landProspects.length) * 100 : 0;

    res.json({
      marketing: { leads: totalLeads, cpl, conversionRate: Math.round(conversionRate * 10) / 10, bookingToAkad: Math.round(bookingToAkad * 10) / 10 },
      admin: { pendingBerkas, sp3kCount, akadCount, rejectRate: Math.round(rejectRate * 10) / 10 },
      production: { avgProgress: Math.round(avgProgress * 10) / 10, deviation, defectRate, readyAkad },
      legal: { totalDocs: legalDocs.length, approved: approvedDocs, pending: pendingDocs, bankableProjects },
      acquisition: { prospects: landProspects.length, avgRoi: Math.round(avgRoi * 10) / 10, legalCleanRate: Math.round(legalCleanRate * 10) / 10 },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get KPI");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/cashflow", async (_req, res) => {
  try {
    const rows = await db.select().from(cashflowRecordsTable);
    const now = new Date();
    const year = now.getFullYear();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const forecast = Array.from({ length: 6 }, (_, index) => {
      const monthIndex = index;
      const scoped = rows.filter((row) => {
        const date = new Date(row.transactionDate);
        return date.getFullYear() === year && date.getMonth() === monthIndex;
      });
      return {
        month: monthNames[monthIndex],
        income: scoped.filter(r => r.type === "cash_in").reduce((sum, r) => sum + Number(r.amount), 0),
        expense: scoped.filter(r => r.type === "cash_out").reduce((sum, r) => sum + Number(r.amount), 0),
      };
    });
    const totalIncome = rows.filter(r => r.type === "cash_in").reduce((sum, r) => sum + Number(r.amount), 0);
    const totalExpense = rows.filter(r => r.type === "cash_out").reduce((sum, r) => sum + Number(r.amount), 0);
    res.json({
      totalIncome,
      totalExpense,
      netCashflow: totalIncome - totalExpense,
      forecast,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/alerts", async (req, res) => {
  try {
    const projects = await db.select().from(projectsTable);
    const alerts: Array<{id: number; type: string; level: string; message: string; projectId: number; projectName: string; createdAt: string}> = [];
    let alertId = 1;

    for (const project of projects) {
      const [masters, materialIn, materialOut, units, legalDocs] = await Promise.all([
        db.select().from(prodMaterialMasterTable),
        db.select().from(prodMaterialInTable).where(eq(prodMaterialInTable.projectId, project.id)),
        db.select().from(prodMaterialOutTable).where(eq(prodMaterialOutTable.projectId, project.id)),
        db.select().from(unitsTable).where(eq(unitsTable.projectId, project.id)),
        db.select().from(legalDocumentsTable).where(eq(legalDocumentsTable.projectId, project.id)),
      ]);

      const belowMin = masters.filter(m => {
        const totalIn = materialIn.filter(r => r.materialId === m.id).reduce((sum, r) => sum + r.quantity, 0);
        const totalOut = materialOut.filter(r => r.materialId === m.id).reduce((sum, r) => sum + r.quantity, 0);
        return totalIn - totalOut < m.minimumStock;
      });
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
