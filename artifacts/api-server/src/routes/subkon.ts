import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  subkonContractsTable,
  subkonPaymentsTable,
  paymentApprovalsTable,
  unitsTable,
  prodMaterialOutTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { listSubkonMaster, normalizeSubkonName } from "../lib/subkon-master";
import { getContractFieldProgress } from "../lib/production-relations";
import { recordFinanceCashflow } from "../lib/finance-sync";

const router: IRouter = Router();

// ─── SUBKON CONTRACTS ────────────────────────────────────────────────────────

router.get("/produksi/subkon/master", async (req, res) => {
  try {
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    const rows = await listSubkonMaster(projectId);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list subkon master");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/produksi/subkon/contracts", async (req, res) => {
  try {
    let rows = await db.select().from(subkonContractsTable).orderBy(subkonContractsTable.createdAt);
    if (req.query.projectId) {
      const pid = parseInt(req.query.projectId as string);
      rows = rows.filter(r => r.projectId === pid);
    }
    res.json(rows.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list subkon contracts");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/produksi/subkon/contracts", async (req, res) => {
  try {
    const { projectId, stageCode, subkonName, unitCount, valuePerUnit, retentionPerUnit, maintenanceMonths, startDate, targetEndDate } = req.body as {
      projectId: number;
      stageCode?: string;
      subkonName: string;
      unitCount: number;
      valuePerUnit: number;
      retentionPerUnit: number;
      maintenanceMonths?: number;
      startDate?: string;
      targetEndDate?: string;
    };
    const cleanSubkonName = normalizeSubkonName(subkonName);
    if (!cleanSubkonName) return res.status(400).json({ error: "Nama subkon wajib diisi" });

    const contractValue = valuePerUnit * unitCount;
    const totalRetention = retentionPerUnit * unitCount;
    const netPayableValue = contractValue - totalRetention;

    const [row] = await db.insert(subkonContractsTable).values({
      projectId,
      stageCode: stageCode ?? null,
      subkonName: cleanSubkonName,
      unitCount,
      valuePerUnit,
      contractValue,
      retentionPerUnit,
      totalRetention,
      netPayableValue,
      maintenanceMonths: maintenanceMonths ?? 3,
      startDate: startDate ?? null,
      targetEndDate: targetEndDate ?? null,
      retentionStatus: "ditahan",
      status: "aktif",
    }).returning();

    res.status(201).json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create subkon contract");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.patch("/produksi/subkon/contracts/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(subkonContractsTable).where(eq(subkonContractsTable.id, id));
    if (!existing) return res.status(404).json({ error: "Not found" });

    const body = { ...req.body };
    if ("subkonName" in body) {
      body.subkonName = normalizeSubkonName(body.subkonName);
      if (!body.subkonName) return res.status(400).json({ error: "Nama subkon wajib diisi" });
    }
    const unitCount = Number(body.unitCount ?? existing.unitCount);
    const valuePerUnit = Number(body.valuePerUnit ?? existing.valuePerUnit);
    const retentionPerUnit = Number(body.retentionPerUnit ?? existing.retentionPerUnit);
    if ("unitCount" in body || "valuePerUnit" in body || "retentionPerUnit" in body) {
      body.contractValue = unitCount * valuePerUnit;
      body.totalRetention = unitCount * retentionPerUnit;
      body.netPayableValue = body.contractValue - body.totalRetention;
    }
    const [row] = await db.update(subkonContractsTable).set(body).where(eq(subkonContractsTable.id, id)).returning();
    res.json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update subkon contract");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.delete("/produksi/subkon/contracts/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const payments = await db.select().from(subkonPaymentsTable).where(eq(subkonPaymentsTable.contractId, id));
    const units = await db.select().from(unitsTable).where(eq(unitsTable.contractId, id));
    const materialOut = await db.select().from(prodMaterialOutTable).where(eq(prodMaterialOutTable.contractId, id));
    if (payments.length || units.length || materialOut.length) {
      return res.status(409).json({
        error: "Kontrak sudah dipakai oleh unit/material/pembayaran. Nonaktifkan kontrak jika tidak dipakai lagi.",
        usage: { payments: payments.length, units: units.length, materialOut: materialOut.length },
      });
    }
    await db.delete(subkonContractsTable).where(eq(subkonContractsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete subkon contract");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── TERMIN PAYMENTS ─────────────────────────────────────────────────────────

router.get("/produksi/subkon/payments", async (req, res) => {
  try {
    let rows = await db.select().from(subkonPaymentsTable).orderBy(subkonPaymentsTable.createdAt);
    if (req.query.contractId) {
      const cid = parseInt(req.query.contractId as string);
      rows = rows.filter(r => r.contractId === cid);
    }
    res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list subkon payments");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/produksi/subkon/payments", async (req, res) => {
  try {
    const { contractId, period, notes } = req.body as {
      contractId: number;
      period: string;
      notes?: string;
    };

    const [contract] = await db.select().from(subkonContractsTable).where(eq(subkonContractsTable.id, contractId));
    if (!contract) return res.status(404).json({ error: "Contract not found" });

    const allPayments = await db.select().from(subkonPaymentsTable).where(eq(subkonPaymentsTable.contractId, contractId));
    const paidPayments = allPayments.filter(p => p.status === "paid");
    const lockedPayments = allPayments.filter(p => ["pending_approval", "approved", "paid"].includes(p.status));
    const totalPaidBefore = paidPayments.reduce((sum, p) => sum + (p.netPayment ?? 0), 0);
    const progressPrevious = lockedPayments.length > 0 ? Math.max(...lockedPayments.map(p => p.progressCurrent)) : 0;
    const terminNumber = allPayments.reduce((max, p) => Math.max(max, p.terminNumber ?? 0), 0) + 1;
    const progressCurrent = await getContractFieldProgress(contractId);
    if (progressCurrent <= progressPrevious) {
      return res.status(400).json({ error: "Progress lapangan belum naik dari termin terakhir" });
    }

    const velocity = progressCurrent - progressPrevious;
    const grossEligibleAmount = (velocity / 100) * contract.contractValue;
    const retentionDeducted = (velocity / 100) * contract.totalRetention;
    const netPayment = grossEligibleAmount - retentionDeducted;

    const [row] = await db.insert(subkonPaymentsTable).values({
      contractId,
      paymentType: "termin",
      terminNumber,
      period: period ?? null,
      progressPrevious,
      progressCurrent,
      velocity,
      grossEligibleAmount,
      retentionDeducted,
      netPayment,
      totalPaidBefore,
      status: "pending_approval",
      notes: notes ?? null,
    }).returning();

    await db.insert(paymentApprovalsTable).values([
      { paymentId: row.id, step: "pengawas", status: "pending" },
      { paymentId: row.id, step: "qc", status: "pending" },
      { paymentId: row.id, step: "manager", status: "pending" },
      { paymentId: row.id, step: "finance", status: "pending" },
    ]);

    res.status(201).json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create subkon payment");
    res.status(400).json({ error: "Invalid request" });
  }
});

// ─── PAYMENT APPROVALS ────────────────────────────────────────────────────────

router.get("/produksi/subkon/approvals", async (req, res) => {
  try {
    const approvals = await db.select().from(paymentApprovalsTable).orderBy(paymentApprovalsTable.createdAt);
    const payments = await db.select().from(subkonPaymentsTable);
    const contracts = await db.select().from(subkonContractsTable);

    const enriched = approvals.map(a => {
      const payment = payments.find(p => p.id === a.paymentId);
      const contract = payment ? contracts.find(c => c.id === payment.contractId) : null;
      return {
        ...a,
        createdAt: a.createdAt.toISOString(),
        approvedAt: a.approvedAt?.toISOString() ?? null,
        payment: payment ? { ...payment, createdAt: payment.createdAt.toISOString(), updatedAt: payment.updatedAt.toISOString() } : null,
        contract: contract ? { ...contract, createdAt: contract.createdAt.toISOString(), updatedAt: contract.updatedAt.toISOString() } : null,
      };
    });
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to list approvals");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/produksi/subkon/approvals/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, approvedBy, notes } = req.body as { status: string; approvedBy?: string; notes?: string };
    const [row] = await db.update(paymentApprovalsTable).set({
      status,
      approvedBy: approvedBy ?? null,
      approvedAt: status !== "pending" ? new Date() : null,
      notes: notes ?? null,
    }).where(eq(paymentApprovalsTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });

    if (status === "rejected") {
      await db.update(subkonPaymentsTable).set({ status: "rejected" }).where(eq(subkonPaymentsTable.id, row.paymentId));
    } else if (status === "approved") {
      const approvals = await db.select().from(paymentApprovalsTable).where(eq(paymentApprovalsTable.paymentId, row.paymentId));
      const allApproved = approvals.every(a => a.status === "approved");
      if (allApproved) {
        await db.update(subkonPaymentsTable).set({ status: "approved" }).where(eq(subkonPaymentsTable.id, row.paymentId));
      }
    }

    res.json({ ...row, createdAt: row.createdAt.toISOString(), approvedAt: row.approvedAt?.toISOString() ?? null });
  } catch (err) {
    req.log.error({ err }, "Failed to update approval");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.patch("/produksi/subkon/payments/:id/mark-paid", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(subkonPaymentsTable).where(eq(subkonPaymentsTable.id, id));
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.status !== "approved") return res.status(400).json({ error: "Pembayaran harus disetujui sebelum ditandai paid" });
    const [row] = await db.update(subkonPaymentsTable).set({ status: "paid", paymentDate: new Date().toISOString().split("T")[0] }).where(eq(subkonPaymentsTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    const [contract] = await db.select().from(subkonContractsTable).where(eq(subkonContractsTable.id, row.contractId));
    if (contract && row.netPayment && row.netPayment > 0) {
      await recordFinanceCashflow({
        transactionDate: row.paymentDate ?? undefined,
        type: "cash_out",
        category: "subkon",
        amount: row.netPayment,
        description: `Pembayaran termin ${row.terminNumber ?? "-"} ${contract.subkonName}`,
        referenceNumber: `SUBKON-${row.contractId}-${row.id}`,
        projectId: contract.projectId,
      });
    }
    res.json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to mark payment as paid");
    res.status(400).json({ error: "Invalid request" });
  }
});

// ─── MATERIAL COMPARISON PER SUBKON ──────────────────────────────────────────

router.get("/produksi/subkon/material-comparison", async (req, res) => {
  try {
    const { prodMaterialMasterTable, prodMaterialOutTable } = await import("@workspace/db");

    const contracts = await db.select().from(subkonContractsTable);
    const payments = await db.select().from(subkonPaymentsTable);
    const masters = await db.select().from(prodMaterialMasterTable);
    const allOut = await db.select().from(prodMaterialOutTable);

    // Filter by projectId jika ada
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : null;
    const filteredContracts = projectId ? contracts.filter(c => c.projectId === projectId) : contracts;
    const filteredOut = projectId ? allOut.filter(o => o.projectId === projectId) : allOut;

    // Ambil hanya records yang punya subkon_name
    const outWithSubkon = filteredOut.filter(o => o.subkonName);

    // Kelompokkan pemakaian per kontrak jika tersedia; fallback ke pola lama untuk data historis.
    const usageMap: Record<string, number> = {};
    for (const o of outWithSubkon) {
      const key = o.contractId
        ? `contract:${o.contractId}__${o.materialId}`
        : `legacy:${o.subkonName}__${o.projectId}__${o.stageCode ?? ""}__${o.materialId}`;
      usageMap[key] = (usageMap[key] ?? 0) + o.quantity;
    }

    const masterMap = new Map(masters.map(m => [m.id, m]));

    // Helper: hitung progress aktual dari payment
    const getUnitsCompleted = (contractId: number, unitCount: number): number => {
      const confirmedPayments = payments.filter(
        p => p.contractId === contractId && (p.status === "approved" || p.status === "paid" || p.status === "pending_approval")
      );
      if (confirmedPayments.length === 0) return 0;
      const maxProgress = Math.max(...confirmedPayments.map(p => p.progressCurrent ?? 0));
      return Math.round((maxProgress / 100) * unitCount);
    };

    // Bangun hasil per contract
    const result = filteredContracts
      .filter(c => c.subkonName)
      .map(c => {
        // Cari material yang digunakan oleh kontrak ini; fallback data lama pakai nama/proyek/tahap.
        const relevantKeys = Object.keys(usageMap).filter(k =>
          k.startsWith(`contract:${c.id}__`)
          || k.startsWith(`legacy:${c.subkonName}__${c.projectId}__${c.stageCode ?? ""}__`)
        );

        // Denominator selalu unitCount — bandingkan total pemakaian vs total anggaran kontrak
        // Ini lebih adil karena material sering dikeluarkan bulk untuk semua unit sekaligus
        const unitsCompleted = getUnitsCompleted(c.id, c.unitCount);
        const denominator = c.unitCount; // selalu full contract scope

        const materials = relevantKeys.map(key => {
          const keyParts = key.split("__");
          const materialId = parseInt(keyParts[keyParts.length - 1] ?? "");
          const master = masterMap.get(materialId);
          if (!master) return null;

          const totalActual = usageMap[key];
          const standardPerUnit = master.standardPerUnit ?? 0;
          const actualPerUnit = denominator > 0 ? totalActual / denominator : 0;
          const deviasiFraction = standardPerUnit > 0 ? (actualPerUnit - standardPerUnit) / standardPerUnit : 0;
          const deviasiPct = Math.round(deviasiFraction * 1000) / 10; // 1 decimal

          // Selisih nilai = (actual - standard) per unit * unitCount * harga
          const unitPrice = master.unitPrice ?? 0;
          const selisihPerUnit = actualPerUnit - standardPerUnit;
          const selisihNilai = Math.round(selisihPerUnit * c.unitCount * unitPrice);

          const status =
            deviasiPct <= -3 ? "SANGAT_EFISIEN"
            : deviasiPct <= 5 ? "EFISIEN"
            : deviasiPct <= 15 ? "PERLU_PERHATIAN"
            : "BOROS";

          return {
            materialId,
            materialName: master.name,
            category: master.category,
            satuan: master.satuan,
            standardPerUnit: Math.round(standardPerUnit * 100) / 100,
            actualPerUnit: Math.round(actualPerUnit * 100) / 100,
            totalActual: Math.round(totalActual * 10) / 10,
            totalStandard: Math.round(standardPerUnit * c.unitCount * 10) / 10,
            deviasiPct,
            selisihNilai,
            unitPrice,
            status,
          };
        }).filter(Boolean);

        // Hitung skor efisiensi: rata-rata deviasi boros dibagi total material
        // Skor 100 = semua material efisien, skor 0 = rata-rata boros 100%+
        const totalBorosDeviasi = materials.reduce((s, m) => s + (m!.deviasiPct > 0 ? m!.deviasiPct : 0), 0);
        const avgBorosDeviasi = materials.length > 0 ? totalBorosDeviasi / materials.length : 0;
        const efficiencyScore = Math.max(0, Math.min(100, Math.round(100 - avgBorosDeviasi)));
        const totalSelisihNilai = materials.reduce((s, m) => s + (m!.selisihNilai ?? 0), 0);

        const overallStatus =
          efficiencyScore >= 90 ? "EFISIEN"
          : efficiencyScore >= 75 ? "CUKUP"
          : efficiencyScore >= 60 ? "PERLU_PERHATIAN"
          : "BOROS";

        return {
          contractId: c.id,
          subkonName: c.subkonName,
          projectId: c.projectId,
          stageCode: c.stageCode,
          unitCount: c.unitCount,
          unitsCompleted,
          efficiencyScore,
          totalSelisihNilai,
          overallStatus,
          materials: materials.sort((a, b) => (b!.deviasiPct) - (a!.deviasiPct)),
        };
      })
      .sort((a, b) => a.efficiencyScore - b.efficiencyScore); // terboros duluan

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to compute material comparison");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
