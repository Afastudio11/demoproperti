import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  customersTable,
  customerStatusHistoryTable,
  customerDocumentsTable,
  bankSubmissionsTable,
  otsRecordsTable,
  sp3kRecordsTable,
  akadRecordsTable,
  htRecordsTable,
  monthlyTargetsTable,
  customerComplaintsTable,
  banksTable,
} from "@workspace/db";
import { eq, and, desc, or, like, sql } from "drizzle-orm";

const router: IRouter = Router();

const PIPELINE_ORDER = [
  "MINAT", "PROSES_BERKAS", "BERKAS_LENGKAP", "SETOR_BANK",
  "OTS", "REVISI", "SP3K", "AKAD", "HT_CAIR",
];

const AGING_THRESHOLDS: Record<string, { warning: number; kritis: number }> = {
  PROSES_BERKAS: { warning: 14, kritis: 30 },
  BERKAS_LENGKAP: { warning: 14, kritis: 30 },
  SETOR_BANK: { warning: 7, kritis: 14 },
  OTS: { warning: 14, kritis: 30 },
  REVISI: { warning: 7, kritis: 14 },
  SP3K: { warning: 7, kritis: 21 },
  AKAD: { warning: 14, kritis: 30 },
};

function calcAging(statusUpdatedAt: Date | null): number {
  if (!statusUpdatedAt) return 0;
  return Math.floor((Date.now() - statusUpdatedAt.getTime()) / (1000 * 60 * 60 * 24));
}

function agingLevel(status: string | null, days: number): "normal" | "warning" | "oranye" | "kritis" {
  if (days < 7) return "normal";
  if (days < 14) return "warning";
  if (days < 30) return "oranye";
  return "kritis";
}

function serializeCustomer(c: typeof customersTable.$inferSelect) {
  const aging = calcAging(c.statusUpdatedAt);
  return {
    ...c,
    dpAmount: c.dpAmount ? parseFloat(c.dpAmount) : null,
    loanAmount: c.loanAmount ? parseFloat(c.loanAmount) : null,
    htAmount: c.htAmount ? parseFloat(c.htAmount) : null,
    unitPrice: c.unitPrice ? parseFloat(c.unitPrice) : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    statusUpdatedAt: c.statusUpdatedAt?.toISOString() ?? null,
    aging,
    agingLevel: agingLevel(c.pipelineStatus, aging),
  };
}

const DEFAULT_DOCUMENTS = [
  { name: "KTP Pemohon", category: "data_pribadi", isRequired: true },
  { name: "KTP Pasangan", category: "data_pribadi", isRequired: false },
  { name: "Kartu Keluarga (KK)", category: "data_pribadi", isRequired: true },
  { name: "NPWP", category: "data_pribadi", isRequired: false },
  { name: "Akta Nikah / Surat Cerai", category: "data_pribadi", isRequired: false },
  { name: "Akta Lahir Anak", category: "data_pribadi", isRequired: false },
  { name: "Pas Foto 3x4", category: "data_pribadi", isRequired: true },
  { name: "Slip Gaji 3 Bulan Terakhir", category: "data_pekerjaan", isRequired: true },
  { name: "SK Pengangkatan / SK Kerja", category: "data_pekerjaan", isRequired: true },
  { name: "Surat Keterangan Kerja", category: "data_pekerjaan", isRequired: true },
  { name: "Kartu Pegawai / ID Card", category: "data_pekerjaan", isRequired: false },
  { name: "SK Terakhir", category: "data_pekerjaan", isRequired: false },
  { name: "Rekening Koran / Buku Tabungan 3 Bulan", category: "data_keuangan", isRequired: true },
  { name: "Surat Keterangan Penghasilan", category: "data_keuangan", isRequired: false },
  { name: "SIUP / NIB", category: "data_keuangan", isRequired: false },
  { name: "Surat Pernyataan Belum Punya Rumah", category: "pendukung", isRequired: true },
  { name: "Surat Permohonan KPR", category: "pendukung", isRequired: true },
  { name: "Formulir Aplikasi Bank", category: "pendukung", isRequired: true },
];

// ─── BANKS ─────────────────────────────────────────────────────────────────

const DEFAULT_BANKS = [
  { name: "BRI", code: "BRI" },
  { name: "BTN", code: "BTN" },
  { name: "Mandiri", code: "MANDIRI" },
  { name: "BNI", code: "BNI" },
  { name: "BSI", code: "BSI" },
  { name: "Bank Sulselbar", code: "SULSELBAR" },
  { name: "CASH", code: "CASH" },
];

router.get("/administrasi/banks", async (req, res) => {
  try {
    let banks = await db.select().from(banksTable).orderBy(banksTable.id);
    if (banks.length === 0) {
      await db.insert(banksTable).values(DEFAULT_BANKS.map(b => ({ ...b, isCustom: false })));
      banks = await db.select().from(banksTable).orderBy(banksTable.id);
    }
    res.json(banks.filter(b => b.isActive));
  } catch (err) {
    req.log.error({ err }, "Failed to list banks");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/administrasi/banks", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });
    const code = name.toUpperCase().replace(/[\s-]/g, "_").replace(/[^A-Z0-9_]/g, "");
    const [bank] = await db.insert(banksTable).values({ name, code, isCustom: true }).returning();
    res.status(201).json(bank);
  } catch (err) {
    req.log.error({ err }, "Failed to create bank");
    res.status(400).json({ error: "Bank sudah ada atau request tidak valid" });
  }
});

// ─── DASHBOARD ─────────────────────────────────────────────────────────────

router.get("/administrasi/dashboard", async (req, res) => {
  try {
    const customers = await db.select().from(customersTable);
    const now = new Date();
    const thisMonth = now.getMonth() + 1;
    const thisYear = now.getFullYear();

    const pipelineCounts: Record<string, number> = {};
    let agingWarning = 0;
    let agingKritis = 0;

    for (const c of customers) {
      const status = c.pipelineStatus ?? "MINAT";
      pipelineCounts[status] = (pipelineCounts[status] || 0) + 1;
      const aging = calcAging(c.statusUpdatedAt);
      const level = agingLevel(status, aging);
      if (level === "warning" || level === "oranye") agingWarning++;
      if (level === "kritis") agingKritis++;
    }

    const aktif = customers.filter(c =>
      PIPELINE_ORDER.includes(c.pipelineStatus ?? "") && c.pipelineStatus !== "HT_CAIR"
    ).length;

    const htRecords = await db.select().from(htRecordsTable);
    const htBulanIni = htRecords
      .filter(h => {
        if (!h.htDate) return false;
        const d = new Date(h.htDate);
        return d.getMonth() + 1 === thisMonth && d.getFullYear() === thisYear;
      })
      .reduce((s, h) => s + (h.htAmount ? parseFloat(h.htAmount) : 0), 0);

    const htTahunIni = htRecords
      .filter(h => {
        if (!h.htDate) return false;
        return new Date(h.htDate).getFullYear() === thisYear;
      })
      .reduce((s, h) => s + (h.htAmount ? parseFloat(h.htAmount) : 0), 0);

    const akadRecords = await db.select().from(akadRecordsTable);
    const akadBulanIni = akadRecords.filter(a => {
      if (!a.akadDate || a.status !== "selesai") return false;
      const d = new Date(a.akadDate);
      return d.getMonth() + 1 === thisMonth && d.getFullYear() === thisYear;
    });

    const bankCount: Record<string, number> = {};
    akadBulanIni.forEach(a => { bankCount[a.bank] = (bankCount[a.bank] || 0) + 1; });
    const bestBank = Object.entries(bankCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

    const totalSp3k = await db.select().from(sp3kRecordsTable);
    const expiredSoon = totalSp3k.filter(s => {
      if (!s.expiryDate || s.status !== "approved") return false;
      const days = Math.floor((new Date(s.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days < 14;
    }).length;

    const healthScore = Math.max(0, Math.min(100,
      100 - (agingKritis * 5) - (agingWarning * 2) - (expiredSoon * 3)
    ));

    res.json({
      pipelineCounts,
      totalAktif: aktif,
      htBulanIni,
      htTahunIni,
      bestBank,
      agingWarning,
      agingKritis,
      expiredSoon,
      healthScore,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get administrasi dashboard");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── CUSTOMERS ─────────────────────────────────────────────────────────────

router.get("/administrasi/customers", async (req, res) => {
  try {
    let customers = await db.select().from(customersTable);
    const { status, projectId, bank, picAdmin, search } = req.query as Record<string, string>;

    if (status) customers = customers.filter(c => c.pipelineStatus === status);
    if (projectId) customers = customers.filter(c => c.projectId === parseInt(projectId));
    if (bank) customers = customers.filter(c => c.bank?.toLowerCase() === bank.toLowerCase());
    if (picAdmin) customers = customers.filter(c => c.picAdmin?.toLowerCase() === picAdmin.toLowerCase());
    if (search) {
      const q = search.toLowerCase();
      customers = customers.filter(c =>
        c.nama.toLowerCase().includes(q) ||
        (c.unitBlock ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q) ||
        (c.picAdmin ?? "").toLowerCase().includes(q)
      );
    }

    res.json(customers.map(serializeCustomer));
  } catch (err) {
    req.log.error({ err }, "Failed to list administrasi customers");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/administrasi/customers", async (req, res) => {
  try {
    const body = req.body;
    const [customer] = await db.insert(customersTable).values({
      ...body,
      statusUpdatedAt: new Date(),
      pipelineStatus: body.pipelineStatus ?? "MINAT",
    }).returning();
    if (customer.pipelineStatus) {
      await db.insert(customerStatusHistoryTable).values({
        customerId: customer.id,
        fromStatus: null,
        toStatus: customer.pipelineStatus,
        changedBy: body.createdBy ?? "system",
        notes: "Customer baru dibuat",
      });
    }
    res.status(201).json(serializeCustomer(customer));
  } catch (err) {
    req.log.error({ err }, "Failed to create administrasi customer");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.get("/administrasi/customers/:id", async (req, res) => {
  try {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, parseInt(req.params.id)));
    if (!customer) return res.status(404).json({ error: "Not found" });
    res.json(serializeCustomer(customer));
  } catch (err) {
    req.log.error({ err }, "Failed to get administrasi customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/administrasi/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const [existing] = await db.select().from(customersTable).where(eq(customersTable.id, id));
    if (!existing) return res.status(404).json({ error: "Not found" });

    const updateData: Record<string, unknown> = { ...body };
    if (body.pipelineStatus && body.pipelineStatus !== existing.pipelineStatus) {
      updateData.statusUpdatedAt = new Date();
      await db.insert(customerStatusHistoryTable).values({
        customerId: id,
        fromStatus: existing.pipelineStatus,
        toStatus: body.pipelineStatus,
        changedBy: body.changedBy ?? "system",
        notes: body.changeNotes ?? null,
      });
    }

    const [updated] = await db.update(customersTable).set(updateData).where(eq(customersTable.id, id)).returning();
    res.json(serializeCustomer(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to update administrasi customer");
    res.status(400).json({ error: "Invalid request" });
  }
});

// ─── STATUS HISTORY ─────────────────────────────────────────────────────────

router.get("/administrasi/customers/:id/history", async (req, res) => {
  try {
    const history = await db.select()
      .from(customerStatusHistoryTable)
      .where(eq(customerStatusHistoryTable.customerId, parseInt(req.params.id)))
      .orderBy(desc(customerStatusHistoryTable.changedAt));
    res.json(history.map(h => ({ ...h, changedAt: h.changedAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to get status history");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DOCUMENTS ─────────────────────────────────────────────────────────────

router.get("/administrasi/customers/:id/documents", async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    let docs = await db.select().from(customerDocumentsTable).where(eq(customerDocumentsTable.customerId, customerId));

    if (docs.length === 0) {
      const inserted = await db.insert(customerDocumentsTable).values(
        DEFAULT_DOCUMENTS.map(d => ({ ...d, customerId }))
      ).returning();
      docs = inserted;
    }

    res.json(docs.map(d => ({
      ...d,
      uploadedAt: d.uploadedAt?.toISOString() ?? null,
      updatedAt: d.updatedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get documents");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/administrasi/documents/:docId", async (req, res) => {
  try {
    const [doc] = await db.update(customerDocumentsTable)
      .set({ ...req.body, uploadedAt: req.body.status !== "belum_ada" ? new Date() : null })
      .where(eq(customerDocumentsTable.id, parseInt(req.params.docId)))
      .returning();
    res.json({ ...doc, uploadedAt: doc.uploadedAt?.toISOString() ?? null, updatedAt: doc.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update document");
    res.status(400).json({ error: "Invalid request" });
  }
});

// ─── BANK SUBMISSIONS ───────────────────────────────────────────────────────

router.get("/administrasi/bank-submissions", async (req, res) => {
  try {
    const submissions = await db.select().from(bankSubmissionsTable).orderBy(desc(bankSubmissionsTable.createdAt));
    const customers = await db.select({ id: customersTable.id, nama: customersTable.nama, unitBlock: customersTable.unitBlock, pipelineStatus: customersTable.pipelineStatus }).from(customersTable);
    const custMap = Object.fromEntries(customers.map(c => [c.id, c]));

    res.json(submissions.map(s => {
      const cust = custMap[s.customerId];
      const aging = s.submittedDate ? Math.floor((Date.now() - new Date(s.submittedDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      return { ...s, createdAt: s.createdAt.toISOString(), customerName: cust?.nama ?? "-", unitBlock: cust?.unitBlock ?? "-", currentStatus: cust?.pipelineStatus ?? "-", aging };
    }));
  } catch (err) {
    req.log.error({ err }, "Failed to list bank submissions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/administrasi/bank-submissions", async (req, res) => {
  try {
    const [sub] = await db.insert(bankSubmissionsTable).values(req.body).returning();
    res.status(201).json({ ...sub, createdAt: sub.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create bank submission");
    res.status(400).json({ error: "Invalid request" });
  }
});

// ─── OTS ────────────────────────────────────────────────────────────────────

router.get("/administrasi/ots", async (req, res) => {
  try {
    const records = await db.select().from(otsRecordsTable).orderBy(desc(otsRecordsTable.createdAt));
    const customers = await db.select({ id: customersTable.id, nama: customersTable.nama, unitBlock: customersTable.unitBlock }).from(customersTable);
    const custMap = Object.fromEntries(customers.map(c => [c.id, c]));

    const total = records.filter(r => r.status === "completed" || r.status === "done").length;
    const lolos = records.filter(r => r.result === "lolos").length;
    const successRate = total > 0 ? Math.round((lolos / total) * 100) : 0;

    res.json({
      records: records.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), customerName: custMap[r.customerId]?.nama ?? "-", unitBlock: custMap[r.customerId]?.unitBlock ?? "-" })),
      successRate,
      total,
      lolos,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list OTS records");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/administrasi/ots", async (req, res) => {
  try {
    const [rec] = await db.insert(otsRecordsTable).values(req.body).returning();
    res.status(201).json({ ...rec, createdAt: rec.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create OTS record");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.patch("/administrasi/ots/:id", async (req, res) => {
  try {
    const [rec] = await db.update(otsRecordsTable).set(req.body).where(eq(otsRecordsTable.id, parseInt(req.params.id))).returning();
    res.json({ ...rec, createdAt: rec.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update OTS record");
    res.status(400).json({ error: "Invalid request" });
  }
});

// ─── SP3K ────────────────────────────────────────────────────────────────────

router.get("/administrasi/sp3k", async (req, res) => {
  try {
    const records = await db.select().from(sp3kRecordsTable).orderBy(desc(sp3kRecordsTable.createdAt));
    const customers = await db.select({ id: customersTable.id, nama: customersTable.nama, unitBlock: customersTable.unitBlock }).from(customersTable);
    const custMap = Object.fromEntries(customers.map(c => [c.id, c]));

    const bankSubs = await db.select().from(bankSubmissionsTable);
    const sp3kRate = bankSubs.length > 0 ? Math.round((records.filter(r => r.status === "approved").length / bankSubs.length) * 100) : 0;

    res.json({
      records: records.map(r => {
        const daysLeft = r.expiryDate ? Math.floor((new Date(r.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
        return {
          ...r,
          approvedAmount: r.approvedAmount ? parseFloat(r.approvedAmount) : null,
          plafonAmount: r.plafonAmount ? parseFloat(r.plafonAmount) : null,
          createdAt: r.createdAt.toISOString(),
          customerName: custMap[r.customerId]?.nama ?? "-",
          unitBlock: custMap[r.customerId]?.unitBlock ?? "-",
          daysLeft,
          expiringSoon: daysLeft !== null && daysLeft < 14 && daysLeft >= 0 && r.status === "approved",
        };
      }),
      sp3kRate,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list SP3K records");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/administrasi/sp3k", async (req, res) => {
  try {
    const [rec] = await db.insert(sp3kRecordsTable).values(req.body).returning();
    res.status(201).json({ ...rec, createdAt: rec.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create SP3K record");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.patch("/administrasi/sp3k/:id", async (req, res) => {
  try {
    const [rec] = await db.update(sp3kRecordsTable).set(req.body).where(eq(sp3kRecordsTable.id, parseInt(req.params.id))).returning();
    res.json({ ...rec, createdAt: rec.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update SP3K record");
    res.status(400).json({ error: "Invalid request" });
  }
});

// ─── AKAD ────────────────────────────────────────────────────────────────────

router.get("/administrasi/akad", async (req, res) => {
  try {
    const records = await db.select().from(akadRecordsTable).orderBy(desc(akadRecordsTable.createdAt));
    const customers = await db.select({ id: customersTable.id, nama: customersTable.nama, unitBlock: customersTable.unitBlock, projectId: customersTable.projectId }).from(customersTable);
    const custMap = Object.fromEntries(customers.map(c => [c.id, c]));

    const now = new Date();
    const bulanIni = records.filter(r => {
      if (!r.akadDate || r.status !== "selesai") return false;
      const d = new Date(r.akadDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const tahunIni = records.filter(r => {
      if (!r.akadDate || r.status !== "selesai") return false;
      return new Date(r.akadDate).getFullYear() === now.getFullYear();
    }).length;

    const allCustomers = await db.select().from(customersTable);
    const booking = allCustomers.length;
    const conversionRate = booking > 0 ? Math.round((tahunIni / booking) * 100) : 0;

    res.json({
      records: records.map(r => ({
        ...r,
        akadAmount: r.akadAmount ? parseFloat(r.akadAmount) : null,
        createdAt: r.createdAt.toISOString(),
        customerName: custMap[r.customerId]?.nama ?? "-",
        unitBlock: custMap[r.customerId]?.unitBlock ?? "-",
      })),
      bulanIni,
      tahunIni,
      conversionRate,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list Akad records");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/administrasi/akad", async (req, res) => {
  try {
    const [rec] = await db.insert(akadRecordsTable).values(req.body).returning();
    if (req.body.customerId && req.body.status === "selesai") {
      await db.update(customersTable).set({ pipelineStatus: "AKAD", statusUpdatedAt: new Date() }).where(eq(customersTable.id, req.body.customerId));
    }
    res.status(201).json({ ...rec, createdAt: rec.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create Akad record");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.patch("/administrasi/akad/:id", async (req, res) => {
  try {
    const [rec] = await db.update(akadRecordsTable).set(req.body).where(eq(akadRecordsTable.id, parseInt(req.params.id))).returning();
    res.json({ ...rec, createdAt: rec.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update Akad record");
    res.status(400).json({ error: "Invalid request" });
  }
});

// ─── HT ─────────────────────────────────────────────────────────────────────

router.get("/administrasi/ht", async (req, res) => {
  try {
    const records = await db.select().from(htRecordsTable).orderBy(desc(htRecordsTable.createdAt));
    const customers = await db.select({ id: customersTable.id, nama: customersTable.nama, unitBlock: customersTable.unitBlock }).from(customersTable);
    const custMap = Object.fromEntries(customers.map(c => [c.id, c]));

    const akadRecords = await db.select().from(akadRecordsTable);
    const akadMap = Object.fromEntries(akadRecords.map(a => [a.customerId, a.akadDate]));

    const now = new Date();
    const bulanIni = records.filter(r => {
      if (!r.htDate) return false;
      const d = new Date(r.htDate);
      return d.getMonth() + 1 === now.getMonth() + 1 && d.getFullYear() === now.getFullYear();
    });
    const tahunIni = records.filter(r => r.htDate && new Date(r.htDate).getFullYear() === now.getFullYear());

    const htBulanIni = bulanIni.reduce((s, r) => s + (r.htAmount ? parseFloat(r.htAmount) : 0), 0);
    const htTahunIni = tahunIni.reduce((s, r) => s + (r.htAmount ? parseFloat(r.htAmount) : 0), 0);

    const lags = records
      .map(r => {
        const akadDate = akadMap[r.customerId];
        if (!akadDate || !r.htDate) return null;
        return Math.floor((new Date(r.htDate).getTime() - new Date(akadDate).getTime()) / (1000 * 60 * 60 * 24));
      })
      .filter((l): l is number => l !== null);

    const avgLag = lags.length > 0 ? Math.round(lags.reduce((a, b) => a + b, 0) / lags.length) : 0;

    const bankTotals: Record<string, number> = {};
    records.forEach(r => { bankTotals[r.bank] = (bankTotals[r.bank] || 0) + (r.htAmount ? parseFloat(r.htAmount) : 0); });

    res.json({
      records: records.map(r => {
        const akadDate = akadMap[r.customerId];
        const lag = akadDate && r.htDate ? Math.floor((new Date(r.htDate).getTime() - new Date(akadDate).getTime()) / (1000 * 60 * 60 * 24)) : null;
        return {
          ...r,
          htAmount: r.htAmount ? parseFloat(r.htAmount) : null,
          createdAt: r.createdAt.toISOString(),
          customerName: custMap[r.customerId]?.nama ?? "-",
          unitBlock: custMap[r.customerId]?.unitBlock ?? "-",
          akadDate: akadDate ?? null,
          lag,
        };
      }),
      htBulanIni,
      htTahunIni,
      unitBulanIni: bulanIni.length,
      unitTahunIni: tahunIni.length,
      avgLag,
      bankTotals,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list HT records");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/administrasi/ht", async (req, res) => {
  try {
    const [rec] = await db.insert(htRecordsTable).values(req.body).returning();
    if (req.body.customerId) {
      await db.update(customersTable).set({ pipelineStatus: "HT_CAIR", statusUpdatedAt: new Date() }).where(eq(customersTable.id, req.body.customerId));
    }
    res.status(201).json({ ...rec, createdAt: rec.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create HT record");
    res.status(400).json({ error: "Invalid request" });
  }
});

// ─── BANK PERFORMANCE ───────────────────────────────────────────────────────

router.get("/administrasi/bank-performance", async (req, res) => {
  try {
    const subs = await db.select().from(bankSubmissionsTable);
    const otsAll = await db.select().from(otsRecordsTable);
    const sp3kAll = await db.select().from(sp3kRecordsTable);
    const akadAll = await db.select().from(akadRecordsTable);
    const htAll = await db.select().from(htRecordsTable);
    const akadMap = Object.fromEntries(akadAll.map(a => [a.customerId, a.akadDate]));

    const banks = [...new Set([
      ...subs.map(s => s.bank),
      ...otsAll.map(o => o.bank),
      ...sp3kAll.map(s => s.bank),
      ...akadAll.map(a => a.bank),
      ...htAll.map(h => h.bank),
    ])].filter(Boolean);

    const performance = banks.map(bank => {
      const bankSubs = subs.filter(s => s.bank === bank).length;
      const bankOts = otsAll.filter(o => o.bank === bank);
      const bankOtsDone = bankOts.filter(o => o.status === "done").length;
      const bankOtsLolos = bankOts.filter(o => o.result === "lolos").length;
      const bankSp3k = sp3kAll.filter(s => s.bank === bank);
      const bankSp3kApproved = bankSp3k.filter(s => s.status === "approved").length;
      const bankAkad = akadAll.filter(a => a.bank === bank && a.status === "selesai");
      const bankHt = htAll.filter(h => h.bank === bank);
      const totalHt = bankHt.reduce((s, h) => s + (h.htAmount ? parseFloat(h.htAmount) : 0), 0);

      const lags = bankHt.map(h => {
        const akadDate = akadMap[h.customerId];
        if (!akadDate || !h.htDate) return null;
        return Math.floor((new Date(h.htDate).getTime() - new Date(akadDate).getTime()) / (1000 * 60 * 60 * 24));
      }).filter((l): l is number => l !== null);
      const avgLag = lags.length > 0 ? Math.round(lags.reduce((a, b) => a + b, 0) / lags.length) : 0;

      return {
        bank,
        totalSetor: bankSubs,
        totalOts: bankOtsDone,
        otsSuccess: bankOtsDone > 0 ? Math.round((bankOtsLolos / bankOtsDone) * 100) : 0,
        totalSp3k: bankSp3kApproved,
        sp3kRate: bankSubs > 0 ? Math.round((bankSp3kApproved / bankSubs) * 100) : 0,
        totalAkad: bankAkad.length,
        akadRate: bankSp3kApproved > 0 ? Math.round((bankAkad.length / bankSp3kApproved) * 100) : 0,
        totalHt,
        avgLag,
      };
    });

    res.json(performance);
  } catch (err) {
    req.log.error({ err }, "Failed to get bank performance");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── AGING ───────────────────────────────────────────────────────────────────

router.get("/administrasi/aging", async (req, res) => {
  try {
    const customers = await db.select().from(customersTable);
    const inPipeline = customers.filter(c => PIPELINE_ORDER.includes(c.pipelineStatus ?? "") && c.pipelineStatus !== "HT_CAIR");

    const result = inPipeline.map(c => {
      const aging = calcAging(c.statusUpdatedAt);
      const level = agingLevel(c.pipelineStatus, aging);
      return { ...serializeCustomer(c), aging, agingLevel: level };
    }).sort((a, b) => b.aging - a.aging);

    const totalHtTertahan = result
      .filter(c => c.agingLevel !== "normal")
      .reduce((s, c) => s + (c.htAmount ?? 0), 0);

    res.json({
      customers: result,
      totalWarning: result.filter(c => c.agingLevel === "warning").length,
      totalKritis: result.filter(c => c.agingLevel === "kritis").length,
      totalHtTertahan,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get aging pipeline");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── MONTHLY TARGETS ────────────────────────────────────────────────────────

router.get("/administrasi/monthly-targets", async (req, res) => {
  try {
    const targets = await db.select().from(monthlyTargetsTable).orderBy(monthlyTargetsTable.year, monthlyTargetsTable.month);
    res.json(targets.map(t => ({ ...t, createdAt: t.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to get monthly targets");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/administrasi/monthly-targets", async (req, res) => {
  try {
    const [target] = await db.insert(monthlyTargetsTable).values(req.body).returning();
    res.status(201).json({ ...target, createdAt: target.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create monthly target");
    res.status(400).json({ error: "Invalid request" });
  }
});

// ─── TARGET REALISASI ───────────────────────────────────────────────────────

router.get("/administrasi/target-realisasi", async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt((req.query.year as string) ?? String(now.getFullYear()));
    const month = parseInt((req.query.month as string) ?? String(now.getMonth() + 1));

    const targets = await db.select().from(monthlyTargetsTable).where(and(eq(monthlyTargetsTable.year, year), eq(monthlyTargetsTable.month, month)));

    const akadAll = await db.select().from(akadRecordsTable);
    const sp3kAll = await db.select().from(sp3kRecordsTable);
    const customers = await db.select().from(customersTable);

    const akadBulan = akadAll.filter(a => {
      if (!a.akadDate || a.status !== "selesai") return false;
      const d = new Date(a.akadDate);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });

    const sp3kBulan = sp3kAll.filter(s => {
      if (!s.sp3kDate || s.status !== "approved") return false;
      const d = new Date(s.sp3kDate);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });

    const totalTargetAkad = targets.reduce((s, t) => s + t.targetAkad, 0);
    const totalAkad = akadBulan.length;
    const totalSp3k = sp3kBulan.length;

    const inPipeline = customers.filter(c =>
      ["SETOR_BANK", "OTS", "REVISI", "SP3K", "AKAD"].includes(c.pipelineStatus ?? "")
    ).length;

    const picPerforma: Record<string, { nama: string; akad: number; sp3k: number; total: number }> = {};
    customers.forEach(c => {
      if (!c.picAdmin) return;
      if (!picPerforma[c.picAdmin]) picPerforma[c.picAdmin] = { nama: c.picAdmin, akad: 0, sp3k: 0, total: 0 };
      picPerforma[c.picAdmin].total++;
    });
    akadBulan.forEach(a => {
      const cust = customers.find(c => c.id === a.customerId);
      if (cust?.picAdmin && picPerforma[cust.picAdmin]) picPerforma[cust.picAdmin].akad++;
    });
    sp3kBulan.forEach(s => {
      const cust = customers.find(c => c.id === s.customerId);
      if (cust?.picAdmin && picPerforma[cust.picAdmin]) picPerforma[cust.picAdmin].sp3k++;
    });

    res.json({
      targets,
      totalTargetAkad,
      totalAkad,
      totalSp3k,
      akadRate: totalTargetAkad > 0 ? Math.round((totalAkad / totalTargetAkad) * 100) : 0,
      sp3kRate: totalTargetAkad > 0 ? Math.round((totalSp3k / totalTargetAkad) * 100) : 0,
      pipelineRate: totalTargetAkad > 0 ? Math.round((inPipeline / totalTargetAkad) * 100) : 0,
      picPerforma: Object.values(picPerforma),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get target realisasi");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── COMPLAINTS ─────────────────────────────────────────────────────────────

router.get("/administrasi/complaints", async (req, res) => {
  try {
    const complaints = await db.select().from(customerComplaintsTable).orderBy(desc(customerComplaintsTable.createdAt));
    const { status, severity, projectId } = req.query as Record<string, string>;

    let filtered = complaints;
    if (status) filtered = filtered.filter(c => c.status === status);
    if (severity) filtered = filtered.filter(c => c.severity === severity);
    if (projectId) filtered = filtered.filter(c => c.projectId === parseInt(projectId));

    const kritis = filtered.filter(c => c.severity === "kritis" && c.status !== "selesai").length;
    const overdue = filtered.filter(c => {
      if (!c.deadline || c.status === "selesai") return false;
      return new Date(c.deadline) < new Date();
    }).length;

    res.json({
      complaints: filtered.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })),
      totalKritis: kritis,
      totalOverdue: overdue,
      total: filtered.length,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list complaints");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/administrasi/complaints", async (req, res) => {
  try {
    const [complaint] = await db.insert(customerComplaintsTable).values(req.body).returning();
    res.status(201).json({ ...complaint, createdAt: complaint.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create complaint");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.patch("/administrasi/complaints/:id", async (req, res) => {
  try {
    const [complaint] = await db.update(customerComplaintsTable)
      .set(req.body)
      .where(eq(customerComplaintsTable.id, parseInt(req.params.id)))
      .returning();
    res.json({ ...complaint, createdAt: complaint.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update complaint");
    res.status(400).json({ error: "Invalid request" });
  }
});

export default router;
