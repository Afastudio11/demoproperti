import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  customersTable,
  unitsTable,
  akadDisbursementsTable,
  debtRecordsTable,
  prodMaterialOutTable,
  reworksTable,
  planningSiteplanShapesTable,
  projectsTable,
} from "@workspace/db";

const router: IRouter = Router();

router.get("/data-quality/mismatches", async (_req, res) => {
  try {
    const [customers, units, disbursements, debts, materialOut, reworks, shapes, projects] = await Promise.all([
      db.select().from(customersTable),
      db.select().from(unitsTable),
      db.select().from(akadDisbursementsTable),
      db.select().from(debtRecordsTable),
      db.select().from(prodMaterialOutTable),
      db.select().from(reworksTable),
      db.select().from(planningSiteplanShapesTable),
      db.select().from(projectsTable),
    ]);

    const issues: Array<{ severity: "urgent" | "warning" | "info"; type: string; message: string; entityId?: number | string; module: string }> = [];
    const unitById = new Map(units.map(u => [u.id, u]));

    for (const c of customers) {
      const linked = c.unitId ? unitById.get(c.unitId) : null;
      const fallback = !linked && c.unitBlock
        ? units.find(u => u.projectId === c.projectId && `${u.blok}-${u.nomor}`.toLowerCase() === c.unitBlock!.toLowerCase())
        : null;
      if (!linked && !fallback) {
        issues.push({ severity: "warning", type: "customer_without_unit", module: "administrasi", entityId: c.id, message: `${c.nama} belum terhubung ke unit produksi/siteplan.` });
      }
    }

    for (const u of units) {
      const sold = ["sold", "akad", "terjual", "terjual_akad"].includes(String(u.status ?? "").toLowerCase()) || !!u.customerId;
      const customer = u.customerId ? customers.find(c => c.id === u.customerId) : customers.find(c => c.unitId === u.id);
      if (sold && !customer) {
        issues.push({ severity: "urgent", type: "sold_unit_without_customer", module: "produksi", entityId: u.id, message: `Unit ${u.blok}-${u.nomor} berstatus terjual/akad tetapi belum punya customer.` });
      }
    }

    for (const s of shapes) {
      if (s.shapeType === "unit" && !s.unitId) {
        issues.push({ severity: "urgent", type: "siteplan_unit_without_unit_id", module: "perencanaan", entityId: s.id, message: `Shape unit ${s.label} belum link ke unitId, progress visual rawan tidak sinkron.` });
      }
    }

    for (const row of materialOut) {
      if (!row.subkonName) issues.push({ severity: "warning", type: "material_without_subkon", module: "produksi", entityId: row.id, message: `Material keluar #${row.id} belum punya subkon.` });
      if (!row.batchId && !row.batchUnits) issues.push({ severity: "info", type: "material_without_batch", module: "produksi", entityId: row.id, message: `Material keluar #${row.id} belum punya batch/unit kerja.` });
    }

    const reworkOutIds = new Set(materialOut.filter(o => o.sourceType === "rework" && o.sourceId).map(o => o.sourceId));
    for (const r of reworks) {
      if (!reworkOutIds.has(r.id)) {
        issues.push({ severity: "info", type: "rework_without_material_source", module: "produksi", entityId: r.id, message: `Rework #${r.id} belum punya material keluar dengan source rework.` });
      }
    }

    for (const d of disbursements) {
      if (Number(d.nominalCair ?? 0) <= 0) continue;
      const project = d.projectId ? projects.find(p => p.id === d.projectId) : null;
      const hasDebt = project ? debts.some(debt => String(debt.projectName ?? "").toLowerCase() === project.nama.toLowerCase()) : false;
      if (!hasDebt) {
        issues.push({ severity: "warning", type: "akad_disbursed_without_project_credit", module: "finance", entityId: d.id, message: `Akad cair #${d.akadId} sudah ada nominal cair, tetapi kredit proyek tidak ditemukan untuk auto-reduction.` });
      }
    }

    res.json({ total: issues.length, urgent: issues.filter(i => i.severity === "urgent").length, warning: issues.filter(i => i.severity === "warning").length, info: issues.filter(i => i.severity === "info").length, issues });
  } catch (err) {
    reqLogSafe(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function reqLogSafe(_err: unknown) {
  // Kept small: this route is diagnostic and should not introduce logging coupling.
}

export default router;
