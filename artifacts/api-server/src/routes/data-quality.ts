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
import { normalizeUnitIdentity, normalizeUnitLabel, unitIdentityKey } from "../lib/unit-identity";

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
    const unitsByCanonicalKey = new Map<string, typeof units>();
    for (const unit of units) {
      const key = unitIdentityKey(unit.projectId, unit.blok, unit.nomor);
      if (key) unitsByCanonicalKey.set(key, [...(unitsByCanonicalKey.get(key) ?? []), unit]);
    }

    for (const c of customers) {
      const linked = c.unitId ? unitById.get(c.unitId) : null;
      const fallbackIdentity = normalizeUnitLabel(c.unitBlock);
      const fallback = !linked && c.projectId != null && fallbackIdentity
        ? units.find(u => unitIdentityKey(u.projectId, u.blok, u.nomor) === unitIdentityKey(c.projectId, fallbackIdentity.blok, fallbackIdentity.nomor))
        : null;
      if (!linked && !fallback) {
        issues.push({ severity: "warning", type: "customer_without_unit", module: "administrasi", entityId: c.id, message: `${c.nama} belum terhubung ke unit produksi/siteplan.` });
      }
    }

    for (const u of units) {
      const canonical = normalizeUnitIdentity(u.blok, u.nomor);
      if (canonical && (u.blok !== canonical.blok || u.nomor !== canonical.nomor)) {
        issues.push({ severity: "warning", type: "noncanonical_unit_label", module: "produksi", entityId: u.id, message: `Unit ${u.blok}-${u.nomor} perlu dinormalisasi menjadi ${canonical.label}.` });
      }
      const sold = ["sold", "akad", "terjual", "terjual_akad"].includes(String(u.status ?? "").toLowerCase()) || !!u.customerId;
      const customer = u.customerId ? customers.find(c => c.id === u.customerId) : customers.find(c => c.unitId === u.id);
      if (sold && !customer) {
        issues.push({ severity: "urgent", type: "sold_unit_without_customer", module: "produksi", entityId: u.id, message: `Unit ${u.blok}-${u.nomor} berstatus terjual/akad tetapi belum punya customer.` });
      }
    }

    for (const [key, duplicateUnits] of unitsByCanonicalKey) {
      if (duplicateUnits.length > 1) {
        issues.push({ severity: "urgent", type: "duplicate_unit_identity", module: "produksi", entityId: duplicateUnits.map(unit => unit.id).join(","), message: `Duplikasi unit ${key.split(":")[1]}: ${duplicateUnits.map(unit => `${unit.blok}-${unit.nomor}`).join(", ")}. Jalankan Hapus tidak sinkron setelah memeriksa unit yang terikat.` });
      }
    }

    for (const s of shapes) {
      const shapeIdentity = normalizeUnitLabel(s.label);
      if (s.shapeType === "unit" && shapeIdentity && s.label !== shapeIdentity.label) {
        issues.push({ severity: "warning", type: "noncanonical_siteplan_label", module: "perencanaan", entityId: s.id, message: `Label Siteplan ${s.label} perlu dinormalisasi menjadi ${shapeIdentity.label}.` });
      }
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
