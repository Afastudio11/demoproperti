import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  subkonContractsTable,
  subkonMasterTable,
  subkonPaymentTermsTable,
  subkonPaymentsTable,
  paymentApprovalsTable,
  unitsTable,
  prodMaterialOutTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { createOrGetSubkonMaster, listSubkonMaster, normalizeSubkonName, normalizedSubkonKey, resolveSubkonMaster } from "../lib/subkon-master";
import { getContractFieldProgress, getUnitsForContract } from "../lib/production-relations";

const router: IRouter = Router();

type PaymentTermInput = {
  id?: number;
  terminNumber?: number;
  label?: string;
  plannedDate?: string | null;
  paymentType?: string;
  grossAmount?: number;
  retentionAmount?: number;
  netAmount?: number;
  notes?: string | null;
};

function serializeTerm(row: typeof subkonPaymentTermsTable.$inferSelect) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizePaymentTerms(terms: PaymentTermInput[] | undefined, totalRetention: number) {
  const rows = (terms ?? []).map((term, index) => {
    const grossAmount = Number(term.grossAmount ?? 0);
    const retentionAmount = Number(term.retentionAmount ?? 0);
    const netAmount = Number(term.netAmount ?? grossAmount - retentionAmount);
    const paymentType = term.paymentType === "retensi" ? "retensi" : "termin";
    return {
      terminNumber: Number(term.terminNumber ?? index + 1),
      label: term.label?.trim() || (paymentType === "retensi" ? "Retensi" : `Termin ${index + 1}`),
      plannedDate: term.plannedDate || null,
      paymentType,
      grossAmount,
      retentionAmount,
      netAmount,
      notes: term.notes || null,
    };
  }).filter(term => term.grossAmount > 0 || term.retentionAmount > 0 || term.netAmount > 0);

  if (!rows.some(term => term.paymentType === "retensi") && totalRetention > 0) {
    rows.push({
      terminNumber: rows.length + 1,
      label: "Retensi",
      plannedDate: null,
      paymentType: "retensi",
      grossAmount: totalRetention,
      retentionAmount: 0,
      netAmount: totalRetention,
      notes: "Pembayaran retensi setelah masa pemeliharaan",
    });
  }

  return rows;
}

async function buildPaymentPreview(contractId: number) {
  const [contract] = await db.select().from(subkonContractsTable).where(eq(subkonContractsTable.id, contractId));
  if (!contract) return { ok: false, status: 404, error: "Contract not found" };

  const allPayments = await db.select().from(subkonPaymentsTable).where(eq(subkonPaymentsTable.contractId, contractId));
  const activePayments = allPayments.filter(p => p.status !== "rejected");
  const grossAlreadyPaid = activePayments.reduce((sum, p) => sum + (p.grossEligibleAmount ?? 0), 0);
  const retentionAlreadyDeducted = activePayments.reduce((sum, p) => sum + (p.retentionDeducted ?? 0), 0);
  const netAlreadyPaid = activePayments.reduce((sum, p) => sum + (p.netPayment ?? 0), 0);
  const progressPrevious = activePayments.length > 0 ? Math.max(...activePayments.map(p => p.progressCurrent ?? 0)) : 0;

  const units = await getUnitsForContract(contractId);
  const progressCurrent = await getContractFieldProgress(contractId);
  const velocity = Math.max(0, progressCurrent - progressPrevious);

  const valuePerUnit = contract.valuePerUnit;
  const retentionPerUnit = contract.retentionPerUnit;

  const unitProgress = units
    .map(unit => {
      const progress = Number(unit.progress ?? 0);
      const earnedGross = Math.round((progress / 100) * valuePerUnit);
      const earnedRetention = Math.round((progress / 100) * retentionPerUnit);
      const earnedNet = earnedGross - earnedRetention;
      return {
        id: unit.id,
        label: `${unit.blok}-${unit.nomor}`,
        blok: unit.blok,
        nomor: unit.nomor,
        tipe: unit.tipe,
        stageCode: unit.stageCode,
        progress,
        status: unit.status,
        readyAkad: !!unit.readyAkad,
        earnedGross,
        earnedRetention,
        earnedNet,
      };
    })
    .sort((a, b) => a.blok.localeCompare(b.blok, undefined, { numeric: true }) || a.nomor.localeCompare(b.nomor, undefined, { numeric: true }));

  const unitStats = {
    total: unitProgress.length,
    selesai: unitProgress.filter(u => u.progress >= 100).length,
    berjalan: unitProgress.filter(u => u.progress > 0 && u.progress < 100).length,
    belumMulai: unitProgress.filter(u => u.progress <= 0).length,
    rataRata: progressCurrent,
  };

  const totalCurrentlyEarned = unitProgress.reduce((sum, u) => sum + u.earnedGross, 0);
  const totalCurrentRetention = unitProgress.reduce((sum, u) => sum + u.earnedRetention, 0);
  const totalCurrentNet = unitProgress.reduce((sum, u) => sum + u.earnedNet, 0);

  const grossEligibleAmount = Math.max(0, totalCurrentlyEarned - grossAlreadyPaid);
  const retentionDeducted = Math.max(0, totalCurrentRetention - retentionAlreadyDeducted);
  const netPayment = Math.max(0, totalCurrentNet - netAlreadyPaid);

  const reasons: string[] = [];
  if (contract.status !== "aktif") reasons.push("Kontrak belum aktif");
  if (progressCurrent <= progressPrevious && activePayments.length > 0) reasons.push("Progress lapangan belum naik dari klaim terakhir");
  if (netPayment <= 0) reasons.push("Tidak ada nominal baru yang bisa diklaim");

  return {
    ok: true,
    contract,
    canSubmit: reasons.length === 0,
    reasons,
    progressPrevious,
    progressCurrent,
    velocity,
    unitStats,
    unitProgress,
    grossEligibleAmount,
    retentionDeducted,
    netPayment,
    totalCurrentlyEarned,
    grossAlreadyPaid,
    netAlreadyPaid,
  };
}

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

router.post("/produksi/subkon/master", async (req, res) => {
  try {
    const row = await createOrGetSubkonMaster(req.body);
    res.status(201).json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create subkon master");
    res.status((err as { statusCode?: number }).statusCode ?? 400).json({ error: (err as Error).message ?? "Invalid request" });
  }
});

router.patch("/produksi/subkon/master/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(subkonMasterTable).where(eq(subkonMasterTable.id, id));
    if (!existing) return res.status(404).json({ error: "Subkon tidak ditemukan" });
    const body = { ...req.body };
    if ("name" in body) {
      body.name = normalizeSubkonName(body.name);
      if (!body.name) return res.status(400).json({ error: "Nama subkon wajib diisi" });
      body.normalizedName = normalizedSubkonKey(body.name);
      const all = await db.select().from(subkonMasterTable);
      const duplicate = all.find(row => row.id !== id && row.normalizedName === body.normalizedName);
      if (duplicate) return res.status(409).json({ error: "Nama subkon sudah ada di master" });
    }
    if ("defaultRetentionPerUnit" in body) body.defaultRetentionPerUnit = Number(body.defaultRetentionPerUnit ?? existing.defaultRetentionPerUnit) || existing.defaultRetentionPerUnit;
    if ("defaultMaintenanceMonths" in body) body.defaultMaintenanceMonths = Number(body.defaultMaintenanceMonths ?? existing.defaultMaintenanceMonths) || existing.defaultMaintenanceMonths;
    const [row] = await db.update(subkonMasterTable).set(body).where(eq(subkonMasterTable.id, id)).returning();
    res.json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update subkon master");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.delete("/produksi/subkon/master/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [contracts, units, materialOut] = await Promise.all([
      db.select().from(subkonContractsTable).where(eq(subkonContractsTable.subkonId, id)),
      db.select().from(unitsTable).where(eq(unitsTable.subkonId, id)),
      db.select().from(prodMaterialOutTable).where(eq(prodMaterialOutTable.subkonId, id)),
    ]);
    if (contracts.length || units.length || materialOut.length) {
      const [row] = await db.update(subkonMasterTable).set({ status: "inactive" }).where(eq(subkonMasterTable.id, id)).returning();
      return res.status(409).json({
        error: "Subkon sudah dipakai. Status diubah menjadi inactive agar histori tetap aman.",
        row,
        usage: { contracts: contracts.length, units: units.length, materialOut: materialOut.length },
      });
    }
    await db.delete(subkonMasterTable).where(eq(subkonMasterTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete subkon master");
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
    const terms = await db.select().from(subkonPaymentTermsTable).orderBy(subkonPaymentTermsTable.terminNumber);
    res.json(rows.map(r => ({
      ...r,
      paymentTerms: terms.filter(t => t.contractId === r.id).map(serializeTerm),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list subkon contracts");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/produksi/subkon/contracts/:id/payment-preview", async (req, res) => {
  try {
    const contractId = Number(req.params.id);
    const preview = await buildPaymentPreview(contractId);
    if (!preview.ok) return res.status((preview as { status: number }).status).json({ error: (preview as { error: string }).error });
    res.json(preview);
  } catch (err) {
    req.log.error({ err }, "Failed to preview subkon payment");
    res.status(400).json({ error: "Gagal menghitung preview pembayaran subkon" });
  }
});

router.post("/produksi/subkon/contracts", async (req, res) => {
  try {
    const { projectId, stageCode, subkonName, unitCount, valuePerUnit, retentionPerUnit, maintenanceMonths, startDate, targetEndDate, paymentTerms } = req.body as {
      projectId: number;
      stageCode?: string;
      subkonName: string;
      unitCount: number;
      valuePerUnit: number;
      retentionPerUnit: number;
      maintenanceMonths?: number;
      startDate?: string;
      targetEndDate?: string;
      paymentTerms?: PaymentTermInput[];
    };
    const master = await resolveSubkonMaster({ subkonName, subkonId: (req.body as { subkonId?: unknown }).subkonId, allowCreate: true });
    if (!master) return res.status(400).json({ error: "Nama subkon wajib diisi" });
    const cleanSubkonName = master.name;

    const contractValue = valuePerUnit * unitCount;
    const totalRetention = retentionPerUnit * unitCount;
    const netPayableValue = contractValue - totalRetention;

    const [row] = await db.insert(subkonContractsTable).values({
      projectId,
      stageCode: stageCode ?? null,
      subkonId: master.id,
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

    const terms = normalizePaymentTerms(paymentTerms, totalRetention);
    const insertedTerms = terms.length
      ? await db.insert(subkonPaymentTermsTable).values(terms.map(term => ({ ...term, contractId: row.id }))).returning()
      : [];

    res.status(201).json({
      ...row,
      paymentTerms: insertedTerms.map(serializeTerm),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
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
      const master = await resolveSubkonMaster({ subkonName: body.subkonName, subkonId: body.subkonId, allowCreate: true });
      if (!master) return res.status(400).json({ error: "Nama subkon wajib diisi" });
      body.subkonId = master.id;
      body.subkonName = master.name;
    } else if ("subkonId" in body) {
      const master = await resolveSubkonMaster({ subkonId: body.subkonId });
      if (!master) return res.status(400).json({ error: "Subkon wajib diisi" });
      body.subkonId = master.id;
      body.subkonName = master.name;
    }
    const unitCount = Number(body.unitCount ?? existing.unitCount);
    const valuePerUnit = Number(body.valuePerUnit ?? existing.valuePerUnit);
    const retentionPerUnit = Number(body.retentionPerUnit ?? existing.retentionPerUnit);
    if ("unitCount" in body || "valuePerUnit" in body || "retentionPerUnit" in body) {
      body.contractValue = unitCount * valuePerUnit;
      body.totalRetention = unitCount * retentionPerUnit;
      body.netPayableValue = body.contractValue - body.totalRetention;
    }
    const paymentTerms = Array.isArray(body.paymentTerms) ? body.paymentTerms as PaymentTermInput[] : undefined;
    delete body.paymentTerms;
    const [row] = await db.update(subkonContractsTable).set(body).where(eq(subkonContractsTable.id, id)).returning();
    let terms = await db.select().from(subkonPaymentTermsTable).where(eq(subkonPaymentTermsTable.contractId, id));
    if (paymentTerms) {
      const payments = await db.select().from(subkonPaymentsTable).where(eq(subkonPaymentsTable.contractId, id));
      if (payments.length) return res.status(409).json({ error: "Jadwal termin tidak bisa diganti karena sudah ada pengajuan pembayaran." });
      await db.delete(subkonPaymentTermsTable).where(eq(subkonPaymentTermsTable.contractId, id));
      const nextTerms = normalizePaymentTerms(paymentTerms, row.totalRetention);
      terms = nextTerms.length
        ? await db.insert(subkonPaymentTermsTable).values(nextTerms.map(term => ({ ...term, contractId: id }))).returning()
        : [];
    }
    res.json({ ...row, paymentTerms: terms.map(serializeTerm), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
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
    await db.delete(subkonPaymentTermsTable).where(eq(subkonPaymentTermsTable.contractId, id));
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
    const { contractId, notes } = req.body as {
      contractId: number;
      notes?: string;
    };

    const preview = await buildPaymentPreview(contractId);
    if (!preview.ok) return res.status((preview as { status: number }).status).json({ error: (preview as { error: string }).error });
    const readyPreview = preview as Awaited<ReturnType<typeof buildPaymentPreview>> & { canSubmit: boolean; reasons: string[] };
    if (!readyPreview.canSubmit) return res.status(400).json({ error: readyPreview.reasons.join(", ") || "Pengajuan belum memenuhi syarat" });

    const [row] = await db.insert(subkonPaymentsTable).values({
      contractId,
      paymentTermId: null,
      paymentType: "progress",
      terminNumber: null,
      period: null,
      progressPrevious: readyPreview.progressPrevious,
      progressCurrent: readyPreview.progressCurrent,
      velocity: readyPreview.velocity,
      grossEligibleAmount: readyPreview.grossEligibleAmount,
      retentionDeducted: readyPreview.retentionDeducted,
      netPayment: readyPreview.netPayment,
      totalPaidBefore: readyPreview.netAlreadyPaid,
      status: "pending_approval",
      notes: notes ?? null,
    }).returning();

    await db.insert(paymentApprovalsTable).values([
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

router.patch("/produksi/subkon/approvals/:id", async (_req, res) => {
  res.status(403).json({ error: "Approval pembayaran subkon hanya boleh diproses dari Finance." });
});

router.patch("/produksi/subkon/payments/:id/mark-paid", async (_req, res) => {
  res.status(403).json({ error: "Pembayaran subkon hanya boleh ditandai paid dari Finance." });
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
