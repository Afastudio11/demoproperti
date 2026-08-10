import { Router } from "express";
import { db } from "@workspace/db";
import {
  financeUploadsTable,
  cashflowRecordsTable,
  rabItemsTable,
  kppFacilitiesTable,
  kppPaymentsTable,
  creditFacilitiesTable,
  creditAllocationsTable,
  creditTransactionsTable,
  debtRecordsTable,
  akadDisbursementsTable,
  financeAkadDisbursementLedgerTable,
  appAuditLogsTable,
  receivableRecordsTable,
  auditFindingsTable,
  financeAlertsTable,
  expansionAnalysesTable,
  akadRecordsTable,
  customersTable,
  unitsTable,
  paymentApprovalsTable,
  subkonPaymentsTable,
  subkonContractsTable,
  projectsTable,
} from "@workspace/db";
import { eq, desc, sql, and, lte, gte, lt } from "drizzle-orm";
import { createDeepSeekClient, DEEPSEEK_MODEL, SATARA_SYSTEM_PROMPT } from "../lib/deepseek";
import { recordFinanceCashflow } from "../lib/finance-sync";
// pdf-parse is CJS — require is available via the ESM banner in build.mjs
const pdfParse: (buf: Buffer) => Promise<{ text: string; numpages: number; info: any }> =
  (globalThis as any).require("pdf-parse");

const router = Router();

function normalizeProjectName(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function isOperationalProject(project: typeof projectsTable.$inferSelect) {
  return project.status !== "archived" && project.fase !== "SCALE" && project.fase !== "KANTOR";
}

function scopedByProjectName<T extends { projectName?: string | null }>(rows: T[], activeProjectNames: Set<string>, excludedProjectNames: Set<string>) {
  return rows.filter((row) => {
    const key = normalizeProjectName(row.projectName);
    if (!key) return true;
    if (excludedProjectNames.has(key)) return false;
    return activeProjectNames.has(key) || !excludedProjectNames.has(key);
  });
}

function parseFinanceNumber(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const raw = String(v).replace(/Rp\.?\s*/gi, "").replace(/\s/g, "").trim();
  if (!raw) return 0;
  const negative = raw.startsWith("(") && raw.endsWith(")");
  const clean = raw.replace(/[()]/g, "").replace(/[^0-9,.-]/g, "");
  const lastComma = clean.lastIndexOf(",");
  const lastDot = clean.lastIndexOf(".");
  let normalized = clean;
  if (lastComma !== -1 && lastDot !== -1) {
    normalized = lastComma > lastDot ? clean.replace(/\./g, "").replace(",", ".") : clean.replace(/,/g, "");
  } else if (lastComma !== -1) {
    const decimals = clean.length - lastComma - 1;
    normalized = decimals > 0 && decimals <= 2 ? clean.replace(/\./g, "").replace(",", ".") : clean.replace(/,/g, "");
  } else if (lastDot !== -1) {
    const decimals = clean.length - lastDot - 1;
    normalized = decimals > 0 && decimals <= 2 ? clean.replace(/,/g, "") : clean.replace(/\./g, "");
  }
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? (negative ? -parsed : parsed) : 0;
}

function normalizeFinanceHeader(v: string): string {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/m[²³]/g, "m2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const FINANCE_FIELD_ALIASES: Record<string, string[]> = {
  projectName: ["nama project", "nama proyek", "project", "proyek"],
  stageInfo: ["tahap pembebasan lahan", "tahap", "fase", "stage"],
  creditorName: ["nama pemilik", "pemilik", "nama kreditur", "kreditur", "nama vendor", "vendor"],
  totalAmount: ["nilai awal", "total amount", "nilai hutang", "total hutang", "jumlah", "nilai", "total"],
  dueDate: ["jatuh tempo", "tanggal jatuh tempo", "due date", "tempo"],
  paidAmount: ["nilai terbayar", "terbayar", "sudah dibayar", "dibayar", "bayar"],
  remainingAmount: ["sisa kewajiban", "sisa hutang", "sisa ekspansi", "remaining", "belum terbayar", "sisa"],
  landArea: ["luas tanah m3", "luas tanah m2", "luas tanah", "luas"],
  notes: ["keterangan", "catatan", "notes", "note"],
  debtorName: ["nama debitur", "debitur", "customer", "pelanggan"],
  transactionDate: ["tanggal", "tgl", "date", "transaction date"],
  type: ["jenis", "tipe", "type", "debit kredit"],
  category: ["kategori", "category"],
  amount: ["jumlah", "nominal", "amount", "nilai", "debit", "kredit"],
  description: ["keterangan", "uraian", "deskripsi", "description"],
  referenceNumber: ["nomor", "no", "ref", "reference", "no ref"],
  itemName: ["item", "pekerjaan", "uraian", "nama item", "nama pekerjaan"],
  rabAmount: ["anggaran", "rab", "rencana", "nilai"],
  realizationAmount: ["realisasi", "aktual", "terbayar"],
  stageCode: ["tahap", "kode", "stage"],
  itemCategory: ["kategori"],
};

function deterministicColumnMap(headers: string[], fields: string[]): Record<string, string | null> {
  const normalizedHeaders = headers.map(h => ({ original: h, normalized: normalizeFinanceHeader(h) }));
  const used = new Set<string>();
  const out: Record<string, string | null> = {};
  for (const field of fields) {
    const aliases = FINANCE_FIELD_ALIASES[field] ?? [field];
    const normalizedAliases = aliases.map(normalizeFinanceHeader);
    let match = normalizedHeaders.find(h => !used.has(h.original) && normalizedAliases.includes(h.normalized));
    if (!match) {
      match = normalizedHeaders.find(h => !used.has(h.original) && normalizedAliases.some(a => h.normalized.includes(a) || a.includes(h.normalized)));
    }
    out[field] = match?.original ?? null;
    if (match) used.add(match.original);
  }
  return out;
}

async function writeAudit(module: string, entityType: string, entityId: number | string, action: string, before: unknown, after: unknown, actor = "system", notes?: string) {
  try {
    await db.insert(appAuditLogsTable).values({
      module,
      entityType,
      entityId: String(entityId),
      action,
      actor,
      before,
      after,
      notes: notes ?? null,
    });
  } catch {
    // Audit logging must not block the operational transaction.
  }
}

async function reduceCreditFacility(input: {
  projectId: number | null | undefined;
  unitId?: number | null;
  stageCode?: string | null;
  amount: number;
  sourceNote: string;
  source?: string;
  sourceId?: number | null;
  transactionDate?: string;
}) {
  const { projectId, unitId, stageCode, amount, sourceNote } = input;
  if (!projectId || amount <= 0) return 0;
  const facilities = (await db.select().from(creditFacilitiesTable))
    .filter(f => f.projectId === projectId && f.status !== "closed" && Number(f.outstandingPrincipal ?? 0) > 0);
  if (facilities.length === 0) return amount;
  const allocations = await db.select().from(creditAllocationsTable);
  const exactIds = new Set(allocations
    .filter(a => unitId && a.unitId === unitId)
    .map(a => a.facilityId));
  const stageIds = new Set(allocations
    .filter(a => !exactIds.size && !unitId && stageCode && a.projectId === projectId && String(a.stageCode ?? "") === stageCode)
    .map(a => a.facilityId));
  const fallbackIds = new Set(facilities
    .filter(f => !exactIds.size && !stageIds.size && (!stageCode || String(f.stageCode ?? "") === stageCode || !f.stageCode))
    .map(f => f.id));
  const ordered = facilities.filter(f => exactIds.has(f.id) || stageIds.has(f.id) || fallbackIds.has(f.id));
  let remainingReduction = amount;
  for (const facility of ordered) {
    if (remainingReduction <= 0) break;
    const currentOutstanding = Number(facility.outstandingPrincipal ?? facility.plafon ?? 0);
    const reduction = Math.min(currentOutstanding, remainingReduction);
    const nextOutstanding = Math.max(0, currentOutstanding - reduction);
    const [row] = await db.update(creditFacilitiesTable).set({
      outstandingPrincipal: String(nextOutstanding),
      status: nextOutstanding <= 0 ? "closed" : facility.status,
    }).where(eq(creditFacilitiesTable.id, facility.id)).returning();
    await db.insert(creditTransactionsTable).values({
      facilityId: facility.id,
      type: "principal_reduction",
      amount: String(reduction),
      source: input.source ?? "akad_cair",
      sourceId: input.sourceId ?? null,
      transactionDate: input.transactionDate ?? new Date().toISOString().split("T")[0],
      notes: sourceNote,
    });
    await writeAudit("finance", "credit_facility", facility.id, "akad_auto_reduction", facility, row, "finance", sourceNote);
    remainingReduction -= reduction;
  }
  return remainingReduction;
}

async function reduceProjectCredit(projectId: number | null | undefined, amount: number, sourceNote: string, context: { unitId?: number | null; stageCode?: string | null; sourceId?: number | null; transactionDate?: string } = {}) {
  if (!projectId || amount <= 0) return;
  const leftoverAfterFacilities = await reduceCreditFacility({
    projectId,
    amount,
    sourceNote,
    sourceId: context.sourceId ?? null,
    transactionDate: context.transactionDate,
    unitId: context.unitId ?? null,
    stageCode: context.stageCode ?? null,
  });
  if (leftoverAfterFacilities <= 0) return;
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) return;
  const debts = await db.select().from(debtRecordsTable);
  const candidates = debts
    .filter(d => String(d.projectName ?? "").toLowerCase() === project.nama.toLowerCase())
    .filter(d => ["kredit", "credit", "hutang", "bank"].includes(String(d.category ?? "").toLowerCase()))
    .filter(d => Number(d.remainingAmount ?? d.totalAmount ?? 0) > 0);
  let remainingReduction = leftoverAfterFacilities;
  for (const debt of candidates) {
    if (remainingReduction <= 0) break;
    const currentPaid = Number(debt.paidAmount ?? 0);
    const currentRemaining = Number(debt.remainingAmount ?? Math.max(0, Number(debt.totalAmount ?? 0) - currentPaid));
    const reduction = Math.min(currentRemaining, remainingReduction);
    const nextPaid = currentPaid + reduction;
    const nextRemaining = Math.max(0, currentRemaining - reduction);
    const metadata = { ...(debt.metadata as Record<string, unknown> | null ?? {}), lastAkadReduction: reduction, lastAkadReductionNote: sourceNote };
    const [row] = await db.update(debtRecordsTable).set({
      paidAmount: String(nextPaid),
      remainingAmount: String(nextRemaining),
      status: nextRemaining <= 0 ? "paid" : "outstanding",
      metadata,
      lockedAt: nextRemaining <= 0 ? new Date() : debt.lockedAt,
      lockedBy: nextRemaining <= 0 ? "system-akad" : debt.lockedBy,
    }).where(eq(debtRecordsTable.id, debt.id)).returning();
    await writeAudit("finance", "debt", debt.id, "akad_auto_reduction", debt, row, "finance", sourceNote);
    remainingReduction -= reduction;
  }
}

function inferCashflowType(input: unknown, amount: number): "cash_in" | "cash_out" {
  const raw = String(input ?? "").toLowerCase();
  if (["cash_out", "out", "keluar", "kredit", "credit", "pengeluaran", "biaya"].includes(raw)) return "cash_out";
  if (["cash_in", "in", "masuk", "debit", "debet", "debitur", "income", "pendapatan"].includes(raw)) return "cash_in";
  return amount < 0 ? "cash_out" : "cash_in";
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
router.get("/finance/dashboard", async (req, res) => {
  try {
    const today = new Date();
    const thisMonth = today.getMonth() + 1;
    const thisYear = today.getFullYear();
    const next30 = new Date(today); next30.setDate(today.getDate() + 30);

    const projects = await db.select().from(projectsTable);
    const activeProjectNames = new Set(projects.filter(isOperationalProject).map((project) => normalizeProjectName(project.nama)));
    const excludedProjectNames = new Set(projects.filter((project) => !isOperationalProject(project)).map((project) => normalizeProjectName(project.nama)));

    const [cashflowRowsRaw, debtsRaw, receivablesRaw, kppsRaw, payments, alerts] = await Promise.all([
      db.select().from(cashflowRecordsTable),
      db.select().from(debtRecordsTable),
      db.select().from(receivableRecordsTable),
      db.select().from(kppFacilitiesTable).where(eq(kppFacilitiesTable.isActive, true)),
      db.select({ kppId: kppPaymentsTable.kppId, total: sql<number>`coalesce(sum(principal_paid::numeric),0)` })
        .from(kppPaymentsTable)
        .groupBy(kppPaymentsTable.kppId),
      db.select().from(financeAlertsTable).where(eq(financeAlertsTable.isRead, false)).orderBy(desc(financeAlertsTable.createdAt)).limit(10),
    ]);

    const cashflowRows = scopedByProjectName(cashflowRowsRaw, activeProjectNames, excludedProjectNames)
      .filter((row) => {
        const d = new Date(row.transactionDate);
        return d.getMonth() + 1 === thisMonth && d.getFullYear() === thisYear;
      });
    const debts = scopedByProjectName(debtsRaw, activeProjectNames, excludedProjectNames)
      .filter((debt) => debt.status === "outstanding" && debt.dueDate && new Date(debt.dueDate) <= next30);
    const kpps = scopedByProjectName(kppsRaw, activeProjectNames, excludedProjectNames);

    const cashIn = cashflowRows.filter((row) => row.type === "cash_in").reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const cashOut = cashflowRows.filter((row) => row.type === "cash_out").reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const netCashflow = cashIn - cashOut;
    const debtTotal = debts.reduce((sum, debt) => sum + Number(debt.remainingAmount ?? debt.totalAmount ?? 0), 0);
    const receivableTotal = receivablesRaw
      .filter((receivable) => receivable.status === "current" && receivable.dueDate && new Date(receivable.dueDate) <= next30)
      .reduce((sum, receivable) => sum + Number(receivable.totalAmount ?? 0), 0);

    const payMap: Record<number, number> = {};
    for (const p of payments) { payMap[p.kppId] = Number(p.total); }

    let totalKpp = 0;
    for (const k of kpps) {
      const paid = payMap[k.id] ?? 0;
      totalKpp += Number(k.plafon) - paid;
    }

    // Finance Score: 0 jika belum ada data sama sekali
    const hasFinanceData = cashIn > 0 || cashOut > 0 || totalKpp > 0;
    const score = !hasFinanceData ? 0 : Math.min(100, Math.max(0, Math.round(
      (netCashflow > 0 ? 25 : (cashIn > 0 || cashOut > 0 ? 10 : 0)) +
      (kpps.length > 0 ? (totalKpp < 5_000_000_000 ? 25 : 15) : 0) +
      (cashIn > 0 && cashOut > 0 ? (cashIn > cashOut * 1.2 ? 25 : 15) : 0) +
      (hasFinanceData ? 25 : 0)
    )));

    res.json({
      cashIn, cashOut, netCashflow,
      outstandingKpp: totalKpp,
      hutangJatuhTempo: debtTotal,
      piutangJatuhTempo: receivableTotal,
      financeScore: score,
      financeStatus: !hasFinanceData ? "SEHAT" : (score >= 80 ? "SEHAT" : score >= 60 ? "WASPADA" : "KRITIS"),
      alerts,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── UPLOADS ──────────────────────────────────────────────────────────────────
router.get("/finance/uploads", async (req, res) => {
  try {
    const rows = await db.select().from(financeUploadsTable).orderBy(desc(financeUploadsTable.uploadedAt));
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/finance/uploads", async (req, res) => {
  try {
    const { fileType, fileName, periodYear, periodMonth, rowCount, status, errorNotes } = req.body;
    const [row] = await db.insert(financeUploadsTable).values({ fileType, fileName, periodYear, periodMonth, rowCount, status: status ?? "berhasil", errorNotes }).returning();
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/finance/uploads/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) { res.status(400).json({ error: "ID tidak valid" }); return; }
    await Promise.all([
      db.delete(cashflowRecordsTable).where(eq(cashflowRecordsTable.uploadId, id)),
      db.delete(rabItemsTable).where(eq(rabItemsTable.uploadId, id)),
      db.delete(debtRecordsTable).where(eq(debtRecordsTable.uploadId, id)),
      db.delete(receivableRecordsTable).where(eq(receivableRecordsTable.uploadId, id)),
    ]);
    await db.delete(financeUploadsTable).where(eq(financeUploadsTable.id, id));
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Bulk import cashflow records
router.post("/finance/uploads/cashflow", async (req, res) => {
  try {
    const { uploadId, records } = req.body as { uploadId: number; records: any[] };
    if (!records?.length) { res.json({ inserted: 0 }); return; }
    const rows = records.map((r: any) => ({
      uploadId, transactionDate: r.transactionDate,
      type: inferCashflowType(r.type, Number(r.amount)),
      category: r.category, projectName: r.projectName, amount: String(Math.abs(Number(r.amount) || 0)),
      description: r.description, referenceNumber: r.referenceNumber,
    }));
    const inserted = await db.insert(cashflowRecordsTable).values(rows).returning();
    res.json({ inserted: inserted.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Bulk import RAB items
router.post("/finance/uploads/rab", async (req, res) => {
  try {
    const { uploadId, records } = req.body as { uploadId: number; records: any[] };
    if (!records?.length) { res.json({ inserted: 0 }); return; }
    const rows = records.map((r: any) => ({
      uploadId, projectName: r.projectName, stageCode: r.stageCode, itemName: r.itemName,
      itemCategory: r.itemCategory, rabAmount: String(r.rabAmount), realizationAmount: String(r.realizationAmount ?? 0),
    }));
    const inserted = await db.insert(rabItemsTable).values(rows).returning();
    res.json({ inserted: inserted.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Bulk import debt records
router.post("/finance/uploads/hutang", async (req, res) => {
  try {
    const { uploadId, records } = req.body as { uploadId: number; records: any[] };
    if (!records?.length) { res.json({ inserted: 0 }); return; }
    const rows = records.map((r: any) => ({
      uploadId, creditorName: r.creditorName, category: r.category,
      totalAmount: String(r.totalAmount), dueDate: r.dueDate, status: r.status ?? "outstanding", notes: r.notes,
    }));
    const inserted = await db.insert(debtRecordsTable).values(rows).returning();
    res.json({ inserted: inserted.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Bulk import receivable records
router.post("/finance/uploads/piutang", async (req, res) => {
  try {
    const { uploadId, records } = req.body as { uploadId: number; records: any[] };
    if (!records?.length) { res.json({ inserted: 0 }); return; }
    const rows = records.map((r: any) => ({
      uploadId, debtorName: r.debtorName, category: r.category,
      totalAmount: String(r.totalAmount), dueDate: r.dueDate, status: r.status ?? "current", notes: r.notes,
    }));
    const inserted = await db.insert(receivableRecordsTable).values(rows).returning();
    res.json({ inserted: inserted.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── AI-POWERED IMPORT ────────────────────────────────────────────────────────
// Endpoint ini menerima data Excel mentah (headers + rows), lalu AI memetakan
// kolom ke skema database secara otomatis — format Excel apapun bisa dibaca.
router.post("/finance/uploads/ai-import", async (req, res) => {
  try {
    const { fileType, fileName, sheets } = req.body as {
      fileType: string;
      fileName: string;
      // Each sheet: { name, headers, rows }
      sheets: Array<{ name: string; headers: string[]; rows: Record<string, any>[] }>;
    };

    if (!sheets?.length || !sheets.some(s => s.rows?.length)) {
      res.status(400).json({ error: "Tidak ada data untuk diimport" });
      return;
    }

    // ── Helper: clean number from Rupiah format ──────────────────────────────
    function cleanNum(v: any): number {
      if (v === null || v === undefined || v === "") return 0;
      if (typeof v === "number") return v;
      const s = String(v).replace(/Rp\.?\s*/gi, "").replace(/\./g, "").replace(/,/g, ".");
      return parseFloat(s) || 0;
    }

    // ── Helper: fuzzy find column by keywords ────────────────────────────────
    function findCol(headers: string[], keywords: string[]): string | null {
      const hLow = headers.map(h => h.toLowerCase().trim());
      for (const kw of keywords) {
        const idx = hLow.findIndex(h => h.includes(kw.toLowerCase()));
        if (idx !== -1) return headers[idx];
      }
      return null;
    }

    // ── Step 1: Use AI to detect column mapping (sample only, fast) ──────────
    const firstSheet = sheets[0];
    const sampleRows = firstSheet.rows.slice(0, 5);

    const SCHEMA_HINTS: Record<string, string> = {
      hutang: `Fields needed: projectName (nama proyek), stageInfo (tahap/fase), creditorName (nama pemilik/kreditur), totalAmount (nilai awal/total), paidAmount (terbayar/sudah dibayar), remainingAmount (sisa kewajiban/belum terbayar), landArea (luas tanah m2/m3), category (kpp|vendor|supplier|internal — default supplier for land), notes (keterangan).`,
      piutang: `Fields needed: debtorName, category (customer|internal|vendor), totalAmount, dueDate (YYYY-MM-DD), status (current|overdue|paid), notes.`,
      cashflow: `Fields needed: transactionDate (YYYY-MM-DD), type (cash_in|cash_out), category, projectName, amount (positive number), description, referenceNumber.`,
      rab: `Fields needed: projectName, stageCode, itemName, itemCategory, rabAmount, realizationAmount.`,
      general_ledger: `Fields needed: transactionDate (YYYY-MM-DD), type (cash_in|cash_out — debit=cash_in kredit=cash_out), category, projectName, amount, description, referenceNumber.`,
      bank: `Fields needed: transactionDate (YYYY-MM-DD), type (cash_in|cash_out — kredit=cash_in debit=cash_out), category (bank), projectName, amount, description, referenceNumber.`,
    };

    const ai = createDeepSeekClient();
    const mappingPrompt = `Kamu adalah sistem deteksi kolom Excel. Tentukan mapping kolom Excel ke field target.

FILE: ${fileName}
SHEET PERTAMA: ${firstSheet.name}
HEADERS: ${JSON.stringify(firstSheet.headers)}
SAMPLE DATA (3 baris): ${JSON.stringify(sampleRows.slice(0, 3), null, 2)}

TARGET FIELDS:
${SCHEMA_HINTS[fileType] ?? SCHEMA_HINTS["cashflow"]}

Kembalikan HANYA JSON object mapping: {"targetField": "ExcelColumnName", ...}
Jika kolom tidak ada di Excel, set ke null.
Contoh: {"creditorName": "NAMA PEMILIK", "totalAmount": "NILAI AWAL", "projectName": "NAMA PROJECT", "paidAmount": "NILAI TERBAYAR"}`;

    const mappingResp = await ai.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: "Kembalikan hanya JSON object yang valid, tanpa penjelasan." },
        { role: "user", content: mappingPrompt },
      ],
      temperature: 0,
      max_tokens: 500,
    });

    let colMap: Record<string, string | null> = {};
    try {
      const raw = mappingResp.choices[0]?.message?.content ?? "{}";
      const match = raw.match(/\{[\s\S]*\}/);
      colMap = match ? JSON.parse(match[0]) : {};
    } catch { colMap = {}; }

    // ── Step 2: Process ALL rows from ALL sheets with rule-based transform ────
    const now = new Date();
    const allSheetRows: Record<string, any>[] = [];
    for (const sheet of sheets) {
      for (const row of sheet.rows) {
        allSheetRows.push({ ...row, _sheet: sheet.name });
      }
    }

    function getVal(row: Record<string, any>, field: string, fallbackKeys: string[] = []): any {
      const mappedCol = colMap[field];
      if (mappedCol && row[mappedCol] !== undefined && row[mappedCol] !== "") return row[mappedCol];
      for (const k of fallbackKeys) {
        const found = findCol(Object.keys(row), [k]);
        if (found && row[found] !== undefined && row[found] !== "") return row[found];
      }
      return null;
    }

    const totalRows = allSheetRows.length;
    const [uploadLog] = await db.insert(financeUploadsTable).values({
      fileType, fileName, periodYear: now.getFullYear(), periodMonth: now.getMonth() + 1,
      rowCount: totalRows, status: "berhasil",
    }).returning();
    const uploadId = uploadLog.id;
    let inserted = 0;
    const BATCH = 100;

    if (fileType === "hutang") {
      // Pola baris ringkasan yang harus dilewati (bukan entri hutang sesungguhnya)
      const SUMMARY_ROW_RE = /^(grand\s*total|sub\s*total|subtotal|total|jumlah\s*total|jumlah|rekapitulasi|rekap|total\s*keseluruhan|grand\s*total\s*.*)$/i;
      function isSummaryRow(creditor: any, project: any): boolean {
        const c = String(creditor ?? "").trim();
        const p = String(project ?? "").trim();
        return SUMMARY_ROW_RE.test(c) || SUMMARY_ROW_RE.test(p);
      }

      const dbRows = allSheetRows.map((row) => {
        const creditor = getVal(row, "creditorName", ["pemilik", "kreditur", "vendor", "nama"]);
        const project = getVal(row, "projectName", ["project", "proyek"]);
        const stage = getVal(row, "stageInfo", ["tahap", "fase", "phase"]);
        const orig = cleanNum(getVal(row, "totalAmount", ["awal", "total", "nilai", "harga"]));
        const paid = cleanNum(getVal(row, "paidAmount", ["terbayar", "bayar", "dibayar", "lunas"]));
        const remaining = cleanNum(getVal(row, "remainingAmount", ["sisa", "kewajiban", "outstanding", "belum"]));
        const land = cleanNum(getVal(row, "landArea", ["luas", "m2", "m3", "area"]));
        const keterangan = getVal(row, "notes", ["keterangan", "catatan", "note"]);
        const effectiveRemaining = remaining > 0 ? remaining : Math.max(0, orig - paid);
        const status = effectiveRemaining <= 0 ? "paid" : "outstanding";
        // Lewati baris ringkasan/total — bukan entri hutang sesungguhnya
        if (isSummaryRow(creditor, null)) return null;
        if (!creditor && orig === 0) return null;
        return {
          uploadId, projectName: project ? String(project).trim() : null,
          stageInfo: stage ? String(stage).trim() : null,
          creditorName: String(creditor ?? "").trim() || "Tidak diketahui",
          category: "supplier", totalAmount: String(orig),
          paidAmount: String(paid), remainingAmount: String(effectiveRemaining),
          landArea: land > 0 ? String(land) : null, status, notes: keterangan ? String(keterangan) : "",
          metadata: { sheet: row._sheet, rawRow: row },
        };
      }).filter(Boolean) as any[];

      for (let i = 0; i < dbRows.length; i += BATCH) {
        const batch = dbRows.slice(i, i + BATCH);
        const result = await db.insert(debtRecordsTable).values(batch).returning();
        inserted += result.length;
      }

    } else if (fileType === "piutang") {
      const dbRows = allSheetRows.map((row) => {
        const debtor = getVal(row, "debtorName", ["debitur", "pelanggan", "customer", "nama"]);
        const orig = cleanNum(getVal(row, "totalAmount", ["jumlah", "piutang", "tagihan", "nilai"]));
        if (!debtor && orig === 0) return null;
        return {
          uploadId, debtorName: String(debtor ?? "").trim() || "Tidak diketahui",
          category: getVal(row, "category", ["kategori"]) ?? "customer",
          totalAmount: String(orig), dueDate: null, status: "current",
          notes: String(getVal(row, "notes", ["keterangan", "catatan"]) ?? ""),
        };
      }).filter(Boolean) as any[];
      for (let i = 0; i < dbRows.length; i += BATCH) {
        const result = await db.insert(receivableRecordsTable).values(dbRows.slice(i, i + BATCH)).returning();
        inserted += result.length;
      }

    } else if (fileType === "cashflow" || fileType === "general_ledger" || fileType === "bank") {
      const dbRows = allSheetRows.map((row) => {
        const amt = cleanNum(getVal(row, "amount", ["jumlah", "nominal", "debit", "kredit", "nilai"]));
        const txDate = getVal(row, "transactionDate", ["tanggal", "tgl", "date"]);
        if (!txDate && amt === 0) return null;
        return {
          uploadId, transactionDate: txDate ?? now.toISOString().split("T")[0],
          type: inferCashflowType(getVal(row, "type", ["jenis", "tipe"]), amt),
          category: String(getVal(row, "category", ["kategori"]) ?? "lainnya"),
          projectName: String(getVal(row, "projectName", ["proyek", "project"]) ?? ""),
          amount: String(Math.abs(amt)),
          description: String(getVal(row, "description", ["keterangan", "uraian", "deskripsi"]) ?? ""),
          referenceNumber: String(getVal(row, "referenceNumber", ["no", "nomor", "ref"]) ?? ""),
        };
      }).filter(Boolean) as any[];
      for (let i = 0; i < dbRows.length; i += BATCH) {
        const result = await db.insert(cashflowRecordsTable).values(dbRows.slice(i, i + BATCH)).returning();
        inserted += result.length;
      }

    } else if (fileType === "rab") {
      const dbRows = allSheetRows.map((row) => {
        const item = getVal(row, "itemName", ["item", "pekerjaan", "uraian", "nama"]);
        const rab = cleanNum(getVal(row, "rabAmount", ["anggaran", "rab", "rencana", "nilai"]));
        if (!item && rab === 0) return null;
        return {
          uploadId,
          projectName: String(getVal(row, "projectName", ["proyek", "project"]) ?? ""),
          stageCode: String(getVal(row, "stageCode", ["tahap", "kode", "stage"]) ?? ""),
          itemName: String(item ?? ""),
          itemCategory: String(getVal(row, "itemCategory", ["kategori"]) ?? ""),
          rabAmount: String(rab),
          realizationAmount: String(cleanNum(getVal(row, "realizationAmount", ["realisasi", "aktual", "terbayar"]))),
        };
      }).filter(Boolean) as any[];
      for (let i = 0; i < dbRows.length; i += BATCH) {
        const result = await db.insert(rabItemsTable).values(dbRows.slice(i, i + BATCH)).returning();
        inserted += result.length;
      }
    }

    res.json({ uploadId, inserted, colMap, totalRows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── PDF IMPORT ───────────────────────────────────────────────────────────────
// Menerima PDF sebagai base64, ekstrak teks, AI parsing → insert ke DB
router.post("/finance/uploads/pdf-import", async (req, res) => {
  try {
    const { fileType, fileName, pdfBase64 } = req.body as {
      fileType: string;
      fileName: string;
      pdfBase64: string;
    };

    if (!pdfBase64) {
      res.status(400).json({ error: "Tidak ada data PDF" });
      return;
    }

    // Decode base64 → Buffer → extract text
    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    const parsed = await pdfParse(pdfBuffer);
    const rawText = parsed.text;

    if (!rawText?.trim()) {
      res.status(400).json({ error: "PDF tidak mengandung teks yang bisa dibaca (mungkin PDF scan/gambar)" });
      return;
    }

    const SCHEMA_TARGETS: Record<string, string> = {
      hutang: `JSON array of objects:
[{ "projectName": "...", "stageInfo": "...", "creditorName": "...", "totalAmount": number, "paidAmount": number, "remainingAmount": number, "landArea": number|null, "status": "outstanding"|"paid"|"overdue", "notes": "..." }]`,
      piutang: `JSON array: [{ "debtorName": "...", "category": "customer"|"internal"|"vendor", "totalAmount": number, "dueDate": "YYYY-MM-DD"|null, "status": "current"|"overdue"|"paid", "notes": "..." }]`,
      cashflow: `JSON array: [{ "transactionDate": "YYYY-MM-DD", "type": "cash_in"|"cash_out", "category": "...", "projectName": "...", "amount": number, "description": "...", "referenceNumber": "..." }]`,
      rab: `JSON array: [{ "projectName": "...", "stageCode": "...", "itemName": "...", "itemCategory": "...", "rabAmount": number, "realizationAmount": number }]`,
      general_ledger: `JSON array: [{ "transactionDate": "YYYY-MM-DD", "type": "cash_in"|"cash_out", "category": "...", "projectName": "...", "amount": number, "description": "...", "referenceNumber": "..." }]`,
      bank: `JSON array: [{ "transactionDate": "YYYY-MM-DD", "type": "cash_in"|"cash_out", "category": "bank", "projectName": "...", "amount": number, "description": "...", "referenceNumber": "..." }]`,
    };

    const targetSchema = SCHEMA_TARGETS[fileType] ?? SCHEMA_TARGETS["cashflow"];
    const ai = createDeepSeekClient();

    // Split text into pages for context (limit total tokens)
    const textToSend = rawText.length > 15000 ? rawText.slice(0, 15000) + "\n...(dipotong)" : rawText;

    const prompt = `Kamu adalah sistem ekstraksi data keuangan dari dokumen PDF.

JENIS DATA: ${fileType}
NAMA FILE: ${fileName}
JUMLAH HALAMAN: ${parsed.numpages}

ISI DOKUMEN PDF:
${textToSend}

TUGAS:
Ekstrak SEMUA data keuangan dari teks di atas dan kembalikan sebagai ${targetSchema}

ATURAN PENTING:
1. Bersihkan angka: hilangkan "Rp", titik ribuan, ganti koma desimal dengan titik
2. Format tanggal ke YYYY-MM-DD, kenali format Indonesia (DD/MM/YYYY, DD Month YYYY, dll)
3. Ekstra semua baris/entri yang ditemukan, jangan lewatkan satu pun
4. Jika field tidak ada, gunakan null atau 0 atau "" sesuai tipe
5. Untuk hutang: totalAmount = nilai awal, paidAmount = yang sudah dibayar, remainingAmount = sisa

Kembalikan HANYA JSON array yang valid, tanpa penjelasan atau markdown.`;

    const completion = await ai.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: "Kembalikan hanya JSON array yang valid. Tidak ada teks lain." },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 8000,
    });

    let rawContent = completion.choices[0]?.message?.content ?? "[]";
    const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("AI tidak mengembalikan JSON array yang valid dari PDF");
    const mapped: any[] = JSON.parse(jsonMatch[0]);

    const now = new Date();
    const [uploadLog] = await db.insert(financeUploadsTable).values({
      fileType, fileName: fileName,
      periodYear: now.getFullYear(), periodMonth: now.getMonth() + 1,
      rowCount: mapped.length, status: "berhasil",
    }).returning();
    const uploadId = uploadLog.id;
    let inserted = 0;
    const BATCH = 100;

    if (fileType === "hutang") {
      const dbRows = mapped.map((r: any) => {
        const orig = Number(r.totalAmount) || 0;
        const paid = Number(r.paidAmount) || 0;
        const remaining = Number(r.remainingAmount) || Math.max(0, orig - paid);
        return {
          uploadId, projectName: r.projectName || null, stageInfo: r.stageInfo || null,
          creditorName: String(r.creditorName || "Tidak diketahui"),
          category: "supplier", totalAmount: String(orig), paidAmount: String(paid),
          remainingAmount: String(remaining), landArea: r.landArea ? String(r.landArea) : null,
          status: remaining <= 0 ? "paid" : "outstanding", notes: r.notes || "",
          metadata: { source: "pdf", pages: parsed.numpages },
        };
      });
      for (let i = 0; i < dbRows.length; i += BATCH) {
        const result = await db.insert(debtRecordsTable).values(dbRows.slice(i, i + BATCH)).returning();
        inserted += result.length;
      }
    } else if (fileType === "piutang") {
      const dbRows = mapped.map((r: any) => ({
        uploadId, debtorName: String(r.debtorName || ""), category: r.category || "customer",
        totalAmount: String(Number(r.totalAmount) || 0), dueDate: r.dueDate || null,
        status: r.status || "current", notes: r.notes || "",
      }));
      for (let i = 0; i < dbRows.length; i += BATCH) {
        const result = await db.insert(receivableRecordsTable).values(dbRows.slice(i, i + BATCH)).returning();
        inserted += result.length;
      }
    } else if (["cashflow", "general_ledger", "bank"].includes(fileType)) {
      const dbRows = mapped.map((r: any) => {
        const amount = Number(r.amount) || 0;
        return {
          uploadId, transactionDate: r.transactionDate || now.toISOString().split("T")[0],
          type: inferCashflowType(r.type ?? r.description ?? r.category, amount), category: r.category || "lainnya",
          projectName: r.projectName || "", amount: String(Math.abs(amount)),
          description: r.description || "", referenceNumber: r.referenceNumber || "",
        };
      });
      for (let i = 0; i < dbRows.length; i += BATCH) {
        const result = await db.insert(cashflowRecordsTable).values(dbRows.slice(i, i + BATCH)).returning();
        inserted += result.length;
      }
    } else if (fileType === "rab") {
      const dbRows = mapped.map((r: any) => ({
        uploadId, projectName: r.projectName || "", stageCode: r.stageCode || "",
        itemName: r.itemName || "", itemCategory: r.itemCategory || "",
        rabAmount: String(Number(r.rabAmount) || 0),
        realizationAmount: String(Number(r.realizationAmount) || 0),
      }));
      for (let i = 0; i < dbRows.length; i += BATCH) {
        const result = await db.insert(rabItemsTable).values(dbRows.slice(i, i + BATCH)).returning();
        inserted += result.length;
      }
    }

    res.json({ uploadId, inserted, pages: parsed.numpages, extractedChars: rawText.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── CASHFLOW ─────────────────────────────────────────────────────────────────
router.get("/finance/cashflow", async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const projects = await db.select().from(projectsTable);
    const activeProjectNames = new Set(projects.filter(isOperationalProject).map((project) => normalizeProjectName(project.nama)));
    const excludedProjectNames = new Set(projects.filter((project) => !isOperationalProject(project)).map((project) => normalizeProjectName(project.nama)));

    const rows = scopedByProjectName(await db.select().from(cashflowRecordsTable), activeProjectNames, excludedProjectNames)
      .filter((row) => new Date(row.transactionDate).getFullYear() === Number(year));

    const byMonth: Record<number, { cashIn: number; cashOut: number; categories: Record<string, number> }> = {};
    for (let m = 1; m <= 12; m++) byMonth[m] = { cashIn: 0, cashOut: 0, categories: {} };

    for (const row of rows) {
      const m = new Date(row.transactionDate).getMonth() + 1;
      const amt = Number(row.amount);
      if (row.type === "cash_in") byMonth[m].cashIn += amt;
      else byMonth[m].cashOut += amt;
      byMonth[m].categories[row.category] = (byMonth[m].categories[row.category] ?? 0) + (row.type === "cash_out" ? -amt : amt);
    }

    const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
    const chart = Object.entries(byMonth).map(([m, d]) => ({
      month: MONTHS[Number(m) - 1],
      cashIn: d.cashIn,
      cashOut: d.cashOut,
      net: d.cashIn - d.cashOut,
    }));

    const thisMonth = new Date().getMonth() + 1;
    const cur = byMonth[thisMonth];

    res.json({
      chart,
      cashInBulanIni: cur.cashIn,
      cashOutBulanIni: cur.cashOut,
      netCashflow: cur.cashIn - cur.cashOut,
      categories: cur.categories,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── KPP TRACKER ──────────────────────────────────────────────────────────────
router.get("/finance/kpp", async (req, res) => {
  try {
    const projects = await db.select().from(projectsTable);
    const activeProjectNames = new Set(projects.filter(isOperationalProject).map((project) => normalizeProjectName(project.nama)));
    const excludedProjectNames = new Set(projects.filter((project) => !isOperationalProject(project)).map((project) => normalizeProjectName(project.nama)));
    const [rawFacilities, payments] = await Promise.all([
      db.select().from(kppFacilitiesTable).orderBy(desc(kppFacilitiesTable.createdAt)),
      db.select({
        kppId: kppPaymentsTable.kppId,
        totalPrincipal: sql<number>`coalesce(sum(principal_paid::numeric),0)`,
        totalInterest: sql<number>`coalesce(sum(interest_paid::numeric),0)`,
      }).from(kppPaymentsTable).groupBy(kppPaymentsTable.kppId),
    ]);
    const facilities = scopedByProjectName(rawFacilities, activeProjectNames, excludedProjectNames);

    const payMap: Record<number, { principal: number; interest: number }> = {};
    for (const p of payments) payMap[p.kppId] = { principal: Number(p.totalPrincipal), interest: Number(p.totalInterest) };

    const data = facilities.map(f => {
      const paid = payMap[f.id]?.principal ?? 0;
      const outstanding = Number(f.plafon) - paid;
      return {
        ...f, plafon: Number(f.plafon), outstanding,
        totalPrincipalPaid: paid,
        totalInterestPaid: payMap[f.id]?.interest ?? 0,
      };
    });

    const recentPayments = await db.select().from(kppPaymentsTable).orderBy(desc(kppPaymentsTable.paymentDate)).limit(20);

    res.json({ facilities: data, recentPayments });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/finance/kpp", async (req, res) => {
  try {
    const { projectName, bankName, plafon, firstDisbursementDate, tenorMonths, interestRate, scheduleNotes } = req.body;
    const [row] = await db.insert(kppFacilitiesTable).values({ projectName, bankName, plafon: String(plafon), firstDisbursementDate, tenorMonths, interestRate: String(interestRate), scheduleNotes }).returning();
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/finance/kpp/:id/payment", async (req, res) => {
  try {
    const kppId = Number(req.params.id);
    const { paymentDate, principalPaid, interestPaid, notes } = req.body;
    const [row] = await db.insert(kppPaymentsTable).values({ kppId, paymentDate, principalPaid: String(principalPaid), interestPaid: String(interestPaid ?? 0), notes }).returning();
    const [facility] = await db.select().from(kppFacilitiesTable).where(eq(kppFacilitiesTable.id, kppId));
    if (facility) {
      await recordFinanceCashflow({
        transactionDate: paymentDate,
        type: "cash_out",
        category: "kpp",
        amount: Number(principalPaid) + Number(interestPaid ?? 0),
        projectName: facility.projectName,
        description: `Pembayaran KPP ${facility.bankName}`,
        referenceNumber: `KPP-${kppId}-${row.id}`,
      });
    }
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── KREDIT & INVESTMENT FACILITIES ──────────────────────────────────────────
async function enrichCreditFacilities() {
  const [facilities, allocations, transactions, projects, units, customers, disbursements] = await Promise.all([
    db.select().from(creditFacilitiesTable).orderBy(desc(creditFacilitiesTable.createdAt)),
    db.select().from(creditAllocationsTable),
    db.select().from(creditTransactionsTable).orderBy(desc(creditTransactionsTable.transactionDate)),
    db.select().from(projectsTable),
    db.select().from(unitsTable),
    db.select().from(customersTable),
    db.select().from(akadDisbursementsTable),
  ]);

  return facilities.map(f => {
    const facilityAllocations = allocations.filter(a => a.facilityId === f.id);
    const facilityUnitIds = new Set(facilityAllocations.map(a => a.unitId).filter(Boolean));
    const allocatedUnits = units.filter(u => facilityUnitIds.has(u.id));
    const unitCustomerIds = new Set(allocatedUnits.map(u => u.customerId).filter(Boolean));
    const linkedCustomers = customers.filter(c => (c.unitId && facilityUnitIds.has(c.unitId)) || unitCustomerIds.has(c.id));
    const linkedCustomerIds = new Set(linkedCustomers.map(c => c.id));
    const linkedDisbursements = disbursements.filter(d => linkedCustomerIds.has(d.customerId));
    const totalAkadCair = linkedDisbursements.reduce((sum, d) => sum + Number(d.nominalCair ?? 0), 0);
    const interestMonthly = Number(f.outstandingPrincipal ?? 0) * (Number(f.interestRateAnnual ?? 0) / 100) / 12;
    const unitCount = facilityAllocations.filter(a => a.unitId).length;
    const unitCairCount = linkedDisbursements.filter(d => Number(d.nominalCair ?? 0) > 0).length;
    const project = projects.find(p => p.id === f.projectId);
    return {
      ...f,
      projectName: project?.nama ?? `Proyek #${f.projectId}`,
      plafon: Number(f.plafon ?? 0),
      outstandingPrincipal: Number(f.outstandingPrincipal ?? 0),
      interestRateAnnual: Number(f.interestRateAnnual ?? 0),
      interestMonthly,
      allocatedUnitCount: unitCount,
      akadCairUnitCount: unitCairCount,
      totalAkadCair,
      allocationWarning: unitCount === 0 ? "Belum ada alokasi unit spesifik. Sinkronisasi memakai proyek/tahap sebagai fallback." : null,
      allocations: facilityAllocations.map(a => ({
        ...a,
        allocatedPrincipal: Number(a.allocatedPrincipal ?? 0),
        unit: a.unitId ? units.find(u => u.id === a.unitId) ?? null : null,
      })),
      transactions: transactions.filter(t => t.facilityId === f.id).map(t => ({ ...t, amount: Number(t.amount ?? 0), createdAt: t.createdAt.toISOString() })),
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    };
  });
}

router.get("/finance/credit-facilities", async (_req, res) => {
  try {
    res.json({ facilities: await enrichCreditFacilities() });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/finance/credit-facilities", async (req, res) => {
  try {
    const plafon = Number(req.body.plafon ?? 0);
    const [row] = await db.insert(creditFacilitiesTable).values({
      facilityName: req.body.facilityName || `${req.body.lenderName ?? "Kredit"} - ${req.body.projectId}`,
      facilityType: req.body.facilityType ?? "kredit",
      lenderName: req.body.lenderName,
      projectId: Number(req.body.projectId),
      stageCode: req.body.stageCode || null,
      plafon: String(plafon),
      outstandingPrincipal: String(Number(req.body.outstandingPrincipal ?? plafon)),
      interestRateAnnual: String(Number(req.body.interestRateAnnual ?? 0)),
      tenorMonths: req.body.tenorMonths ? Number(req.body.tenorMonths) : null,
      startDate: req.body.startDate || null,
      status: req.body.status ?? "active",
      notes: req.body.notes ?? null,
    }).returning();
    await writeAudit("finance", "credit_facility", row.id, "create", null, row, "finance", row.notes ?? undefined);
    res.status(201).json({ ...row, plafon: Number(row.plafon), outstandingPrincipal: Number(row.outstandingPrincipal), interestRateAnnual: Number(row.interestRateAnnual ?? 0), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/finance/credit-facilities/:id/allocations", async (req, res) => {
  try {
    const facilityId = Number(req.params.id);
    const [facility] = await db.select().from(creditFacilitiesTable).where(eq(creditFacilitiesTable.id, facilityId));
    if (!facility) return res.status(404).json({ error: "Fasilitas kredit tidak ditemukan" });
    const unitIds = Array.isArray(req.body.unitIds) ? req.body.unitIds.map(Number).filter(Number.isFinite) : [];
    if (unitIds.length === 0 && !req.body.stageCode) return res.status(400).json({ error: "Pilih unit atau tahap untuk alokasi kredit" });

    await db.delete(creditAllocationsTable).where(eq(creditAllocationsTable.facilityId, facilityId));
    let rows: Array<typeof creditAllocationsTable.$inferInsert> = [];
    if (unitIds.length > 0) {
      const allUnits = await db.select().from(unitsTable);
      const selectedUnits = allUnits.filter(u => unitIds.includes(u.id));
      if (selectedUnits.length !== unitIds.length || selectedUnits.some(unit => unit.projectId !== facility.projectId)) {
        return res.status(400).json({ error: "Setiap unit kredit harus berasal dari proyek fasilitas yang sama." });
      }
      const perUnit = selectedUnits.length > 0 ? Number(facility.plafon ?? 0) / selectedUnits.length : 0;
      rows = selectedUnits.map(unit => ({
        facilityId,
        unitId: unit.id,
        projectId: unit.projectId,
        stageCode: unit.stageCode ?? facility.stageCode ?? null,
        allocatedPrincipal: String(req.body.allocatedPrincipal ? Number(req.body.allocatedPrincipal) : perUnit),
      }));
    } else {
      rows = [{
        facilityId,
        unitId: null,
        projectId: facility.projectId,
        stageCode: req.body.stageCode ?? facility.stageCode ?? null,
        allocatedPrincipal: String(Number(req.body.allocatedPrincipal ?? facility.plafon ?? 0)),
      }];
    }
    const inserted = rows.length ? await db.insert(creditAllocationsTable).values(rows).returning() : [];
    res.json({ ok: true, allocations: inserted });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/finance/credit-facilities/:id/sync-akad", async (req, res) => {
  try {
    const facilityId = Number(req.params.id);
    const [facility] = await db.select().from(creditFacilitiesTable).where(eq(creditFacilitiesTable.id, facilityId));
    if (!facility) return res.status(404).json({ error: "Fasilitas kredit tidak ditemukan" });
    const [allocations, units, customers, ledgers, existingTx] = await Promise.all([
      db.select().from(creditAllocationsTable).where(eq(creditAllocationsTable.facilityId, facilityId)),
      db.select().from(unitsTable),
      db.select().from(customersTable),
      db.select().from(financeAkadDisbursementLedgerTable),
      db.select().from(creditTransactionsTable).where(eq(creditTransactionsTable.facilityId, facilityId)),
    ]);
    const allocatedUnitIds = new Set(allocations.map(a => a.unitId).filter((id): id is number => typeof id === "number"));
    const allocatedUnits = units.filter(u => allocatedUnitIds.has(u.id));
    const allocatedCustomerIds = allocatedUnits.map(u => u.customerId).filter((id): id is number => typeof id === "number");
    const stageAllocations = allocations.filter(a => !a.unitId);
    const customerIds = new Set([
      ...allocatedCustomerIds,
      ...customers
        .filter(c => {
          if (c.unitId && allocatedUnitIds.has(c.unitId)) return true;
          if (allocatedUnitIds.size > 0) return false;
          return stageAllocations.some(a => c.projectId === a.projectId && (!a.stageCode || c.stageCode === a.stageCode));
        })
        .map(c => c.id),
    ]);
    const syncedSources = new Set(existingTx.filter(t => t.source === "akad_cair").map(t => t.sourceId));
    let syncedAmount = 0;
    for (const ledger of ledgers) {
      if (!customerIds.has(ledger.customerId) || syncedSources.has(ledger.id)) continue;
      const amount = Number(ledger.nominalCair ?? 0);
      const customer = customers.find(c => c.id === ledger.customerId);
      const unit = customer?.unitId
        ? units.find(u => u.id === customer.unitId)
        : units.find(u => u.customerId === ledger.customerId);
      const leftover = await reduceCreditFacility({
        projectId: facility.projectId,
        unitId: unit?.id ?? null,
        stageCode: customer?.stageCode ?? unit?.stageCode ?? facility.stageCode ?? null,
        amount,
        sourceNote: `Sync akad cair ledger #${ledger.id}`,
        source: "akad_cair",
        sourceId: ledger.id,
        transactionDate: ledger.tanggalCair,
      });
      syncedAmount += amount - Math.max(0, leftover);
    }
    res.json({ ok: true, syncedAmount, facilities: await enrichCreditFacilities() });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/finance/credit-facilities/accrue-interest", async (req, res) => {
  try {
    const period = String(req.query.period ?? new Date().toISOString().slice(0, 7));
    const transactionDate = `${period}-01`;
    const facilities = (await db.select().from(creditFacilitiesTable)).filter(f => f.status !== "closed" && Number(f.outstandingPrincipal ?? 0) > 0);
    const existing = await db.select().from(creditTransactionsTable);
    let inserted = 0;
    for (const facility of facilities) {
      const duplicate = existing.find(t => t.facilityId === facility.id && t.type === "interest_accrual" && String(t.transactionDate).startsWith(period));
      if (duplicate) continue;
      const amount = Number(facility.outstandingPrincipal ?? 0) * (Number(facility.interestRateAnnual ?? 0) / 100) / 12;
      if (amount <= 0) continue;
      const [row] = await db.insert(creditTransactionsTable).values({
        facilityId: facility.id,
        type: "interest_accrual",
        amount: String(amount),
        source: "monthly_interest",
        sourceId: null,
        transactionDate,
        notes: `Accrual bunga ${period}`,
      }).returning();
      await recordFinanceCashflow({
        transactionDate,
        type: "cash_out",
        category: "bunga_kredit",
        amount,
        projectName: undefined,
        projectId: facility.projectId,
        description: `Bunga ${facility.facilityName} ${period}`,
        referenceNumber: `CREDIT-INT-${facility.id}-${row.id}`,
      });
      inserted++;
    }
    res.json({ ok: true, period, inserted, facilities: await enrichCreditFacilities() });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// ─── PAY INTEREST MANUALLY ────────────────────────────────────────────────────
router.post("/finance/credit-facilities/:id/pay-interest", async (req, res) => {
  try {
    const facilityId = Number(req.params.id);
    const [facility] = await db.select().from(creditFacilitiesTable).where(eq(creditFacilitiesTable.id, facilityId));
    if (!facility) return res.status(404).json({ error: "Fasilitas tidak ditemukan" });
    const amount = Number(req.body.amount ?? 0);
    if (amount <= 0) return res.status(400).json({ error: "Jumlah bunga harus lebih dari 0" });
    const paymentDate = String(req.body.paymentDate ?? new Date().toISOString().split("T")[0]);
    const notes = String(req.body.notes ?? "");
    const [row] = await db.insert(creditTransactionsTable).values({
      facilityId,
      type: "interest_paid",
      amount: String(amount),
      source: "manual_payment",
      sourceId: null,
      transactionDate: paymentDate,
      notes: notes || `Pembayaran bunga manual ${paymentDate}`,
    }).returning();
    await recordFinanceCashflow({
      transactionDate: paymentDate,
      type: "cash_out",
      category: "bunga_kredit",
      amount,
      projectId: facility.projectId,
      description: `Bayar bunga ${facility.facilityName}${notes ? " — " + notes : ""}`,
      referenceNumber: `CREDIT-PAY-${facilityId}-${row.id}`,
    });
    res.json({ ok: true, transaction: row, facilities: await enrichCreditFacilities() });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// ─── HUTANG CENTER ────────────────────────────────────────────────────────────
router.get("/finance/hutang", async (req, res) => {
  try {
    const d30 = new Date(); d30.setDate(d30.getDate() + 30);
    const d60 = new Date(); d60.setDate(d60.getDate() + 60);

    const records = await db.select().from(debtRecordsTable).orderBy(debtRecordsTable.projectName, debtRecordsTable.createdAt);

    // Group by project
    const byProject: Record<string, { totalAmount: number; paidAmount: number; remainingAmount: number; items: any[] }> = {};
    const byCategory: Record<string, { total: number; lt30: number; d30_60: number; gt60: number }> = {};
    let totalAll = 0;
    let totalPaid = 0;
    let totalRemaining = 0;

    for (const r of records) {
      const orig = Number(r.totalAmount);
      const paid = Number(r.paidAmount ?? 0);
      const remaining = Number(r.remainingAmount ?? (orig - paid));
      const due = r.dueDate ? new Date(r.dueDate) : null;
      const proj = r.projectName ?? "Lainnya";
      const cat = r.category;

      // By project
      if (!byProject[proj]) byProject[proj] = { totalAmount: 0, paidAmount: 0, remainingAmount: 0, items: [] };
      byProject[proj].totalAmount += orig;
      byProject[proj].paidAmount += paid;
      byProject[proj].remainingAmount += remaining;
      byProject[proj].items.push({ ...r, metadata: r.metadata ?? {}, totalAmount: orig, paidAmount: paid, remainingAmount: remaining });

      // By category (use remaining for aging)
      if (!byCategory[cat]) byCategory[cat] = { total: 0, lt30: 0, d30_60: 0, gt60: 0 };
      byCategory[cat].total += remaining;
      if (due) {
        if (due <= d30) byCategory[cat].lt30 += remaining;
        else if (due <= d60) byCategory[cat].d30_60 += remaining;
        else byCategory[cat].gt60 += remaining;
      }

      totalAll += orig;
      totalPaid += paid;
      totalRemaining += remaining;
    }

    res.json({ byProject, byCategory, total: totalAll, totalPaid, totalRemaining, records: records.map(r => ({ ...r, metadata: r.metadata ?? {} })) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/finance/hutang", async (req, res) => {
  try {
    const { creditorName, category, totalAmount, paidAmount, remainingAmount, projectName, stageInfo, dueDate, notes, metadata } = req.body;
    const paid = Number(paidAmount ?? 0);
    const orig = Number(totalAmount ?? 0);
    const remaining = Number(remainingAmount ?? (orig - paid));
    const status = remaining <= 0 ? "paid" : "outstanding";
    const [row] = await db.insert(debtRecordsTable).values({
      creditorName, category, totalAmount: String(orig), paidAmount: String(paid),
      remainingAmount: String(remaining), projectName, stageInfo, dueDate, notes, status, metadata: metadata ?? {},
    }).returning();
    await writeAudit("finance", "debt", row.id, "create", null, row, "finance", notes);
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── FINANCE APPROVAL MIRROR ─────────────────────────────────────────────────
router.get("/finance/approval/subkon", async (_req, res) => {
  try {
    const approvals = await db.select().from(paymentApprovalsTable).orderBy(paymentApprovalsTable.createdAt);
    const payments = await db.select().from(subkonPaymentsTable);
    const contracts = await db.select().from(subkonContractsTable);
    const rows = approvals.map(a => {
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
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/finance/approval/subkon/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, approvedBy, notes } = req.body as { status: string; approvedBy?: string; notes?: string };
    const [before] = await db.select().from(paymentApprovalsTable).where(eq(paymentApprovalsTable.id, id));
    const [row] = await db.update(paymentApprovalsTable).set({
      status,
      approvedBy: approvedBy ?? "Finance",
      approvedAt: status !== "pending" ? new Date() : null,
      notes: notes ?? null,
    }).where(eq(paymentApprovalsTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    if (status === "rejected") {
      await db.update(subkonPaymentsTable).set({ status: "rejected" }).where(eq(subkonPaymentsTable.id, row.paymentId));
    } else if (status === "approved") {
      const approvals = await db.select().from(paymentApprovalsTable).where(eq(paymentApprovalsTable.paymentId, row.paymentId));
      if (approvals.every(a => a.status === "approved")) {
        const [updatedPayment] = await db.update(subkonPaymentsTable).set({ status: "approved" }).where(eq(subkonPaymentsTable.id, row.paymentId)).returning();
        if (updatedPayment?.paymentType === "retensi") {
          await db.update(subkonContractsTable)
            .set({ retentionStatus: "siap_cair" })
            .where(eq(subkonContractsTable.id, updatedPayment.contractId));
        }
      }
    }
    await writeAudit("finance", "payment_approval", id, status, before ?? null, row, approvedBy ?? "Finance", notes);
    res.json({ ...row, createdAt: row.createdAt.toISOString(), approvedAt: row.approvedAt?.toISOString() ?? null });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/finance/approval/subkon/:paymentId/resubmit", async (req, res) => {
  try {
    const paymentId = Number(req.params.paymentId);
    const [payment] = await db.select().from(subkonPaymentsTable).where(eq(subkonPaymentsTable.id, paymentId));
    if (!payment) return res.status(404).json({ error: "Pembayaran tidak ditemukan" });
    if (payment.status === "paid") return res.status(423).json({ error: "Pembayaran sudah dibayar, tidak bisa disubmit ulang" });
    const rejectedApprovals = await db.select().from(paymentApprovalsTable)
      .where(and(eq(paymentApprovalsTable.paymentId, paymentId), eq(paymentApprovalsTable.status, "rejected")));
    if (rejectedApprovals.length === 0) return res.status(400).json({ error: "Tidak ada approval yang ditolak" });
    for (const a of rejectedApprovals) {
      await db.update(paymentApprovalsTable).set({ status: "pending", approvedBy: null, approvedAt: null, notes: null })
        .where(eq(paymentApprovalsTable.id, a.id));
    }
    const [updated] = await db.update(subkonPaymentsTable).set({ status: "pending_approval" }).where(eq(subkonPaymentsTable.id, paymentId)).returning();
    await writeAudit("finance", "subkon_payment", paymentId, "resubmit", payment, updated, req.body.submittedBy ?? "produksi");
    res.json({ ok: true, payment: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() } });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/finance/approval/subkon-payments/:id/lock", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await db.select().from(subkonPaymentsTable).where(eq(subkonPaymentsTable.id, id));
    if (!existing) return res.status(404).json({ error: "Pembayaran tidak ditemukan" });
    if (existing.lockedAt) return res.status(423).json({ error: "Pembayaran sudah terkunci" });
    if (existing.status !== "paid") return res.status(400).json({ error: "Hanya pembayaran berstatus paid yang bisa dikunci" });
    const [row] = await db.update(subkonPaymentsTable).set({ lockedAt: new Date(), lockedBy: req.body.lockedBy ?? "Finance" })
      .where(eq(subkonPaymentsTable.id, id)).returning();
    await writeAudit("finance", "subkon_payment", id, "lock", existing, row, req.body.lockedBy ?? "Finance");
    res.json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/finance/approval/subkon-payments/:id/mark-paid", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await db.select().from(subkonPaymentsTable).where(eq(subkonPaymentsTable.id, id));
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.status !== "approved" && existing.status !== "paid") return res.status(400).json({ error: "Pembayaran harus approved" });
    const paymentDate = req.body.paymentDate ?? new Date().toISOString().split("T")[0];
    const [row] = await db.update(subkonPaymentsTable).set({ status: "paid", paymentDate }).where(eq(subkonPaymentsTable.id, id)).returning();
    if (row.paymentType === "retensi") {
      await db.update(subkonContractsTable)
        .set({ retentionStatus: "sudah_cair" })
        .where(eq(subkonContractsTable.id, row.contractId));
    }
    const [contract] = await db.select().from(subkonContractsTable).where(eq(subkonContractsTable.id, row.contractId));
    if (contract && row.netPayment && row.netPayment > 0) {
      await recordFinanceCashflow({
        transactionDate: paymentDate,
        type: "cash_out",
        category: "subkon",
        amount: row.netPayment,
        description: `Pembayaran termin ${row.terminNumber ?? "-"} ${contract.subkonName}`,
        referenceNumber: `SUBKON-${row.contractId}-${row.id}`,
        projectId: contract.projectId,
      });
    }
    await writeAudit("finance", "subkon_payment", id, "mark_paid", existing, row, "Finance", `Pembayaran termin ${row.terminNumber ?? "-"}`);
    res.json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), contract });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// ─── AKAD CAIR TRACKER ───────────────────────────────────────────────────────
router.get("/finance/akad-cair", async (_req, res) => {
  try {
    const [akads, disbursements, customers, units] = await Promise.all([
      db.select().from(akadRecordsTable).orderBy(desc(akadRecordsTable.createdAt)),
      db.select().from(akadDisbursementsTable),
      db.select().from(customersTable),
      db.select().from(unitsTable),
    ]);
    const rows = akads.map(a => {
      const customer = customers.find(c => c.id === a.customerId) ?? null;
      const unit = customer?.unitId
        ? units.find(u => u.id === customer.unitId)
        : units.find(u => u.projectId === customer?.projectId && `${u.blok}-${u.nomor}`.toLowerCase() === String(customer?.unitBlock ?? "").toLowerCase());
      const finance = disbursements.find(d => d.akadId === a.id) ?? null;
      const akadAmount = a.akadAmount ? Number(a.akadAmount) : 0;
      const nominalCair = finance?.nominalCair ? Number(finance.nominalCair) : 0;
      return {
        ...a,
        akadAmount,
        createdAt: a.createdAt.toISOString(),
        customerName: customer?.nama ?? "-",
        projectId: customer?.projectId ?? unit?.projectId ?? null,
        unitBlock: customer?.unitBlock ?? (unit ? `${unit.blok}-${unit.nomor}` : "-"),
        progressRumah: unit?.progress ?? 0,
        finance: finance ? { ...finance, nominalCair, createdAt: finance.createdAt.toISOString(), updatedAt: finance.updatedAt.toISOString() } : null,
        statusCair: finance?.statusCair ?? "belum_cair",
        nominalCair,
        sisaBelumCair: Math.max(0, akadAmount - nominalCair),
      };
    });
    res.json({ records: rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/finance/akad-cair/:akadId", async (req, res) => {
  try {
    const akadId = Number(req.params.akadId);
    const [akad] = await db.select().from(akadRecordsTable).where(eq(akadRecordsTable.id, akadId));
    if (!akad) return res.status(404).json({ error: "Akad tidak ditemukan" });
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, akad.customerId));
    const [unit] = customer?.unitId
      ? await db.select().from(unitsTable).where(eq(unitsTable.id, customer.unitId))
      : [];
    const existing = await db.select().from(akadDisbursementsTable).where(eq(akadDisbursementsTable.akadId, akadId));
    const values = {
      akadId,
      customerId: akad.customerId,
      projectId: customer?.projectId ?? null,
      statusCair: req.body.statusCair ?? "belum_cair",
      tanggalCair: req.body.tanggalCair || null,
      nominalCair: String(Number(req.body.nominalCair ?? 0)),
      bankDeduction: String(Number(req.body.bankDeduction ?? 0)),
      destinationAccount: req.body.destinationAccount ?? null,
      proofUrl: req.body.proofUrl ?? null,
      notes: req.body.notes ?? null,
      updatedBy: req.body.updatedBy ?? "finance",
    };
    const before = existing[0] ?? null;
    const previousNominal = before?.nominalCair ? Number(before.nominalCair) : 0;
    const nextNominal = Number(req.body.nominalCair ?? 0);
    const [row] = existing.length
      ? await db.update(akadDisbursementsTable).set(values).where(eq(akadDisbursementsTable.id, existing[0].id)).returning()
      : await db.insert(akadDisbursementsTable).values(values).returning();
    const delta = Math.max(0, nextNominal - previousNominal);
    if (delta > 0 && values.tanggalCair) {
      const [ledger] = await db.insert(financeAkadDisbursementLedgerTable).values({
        akadId,
        disbursementId: row.id,
        customerId: akad.customerId,
        projectId: customer?.projectId ?? null,
        tanggalCair: values.tanggalCair,
        nominalCair: String(delta),
        bankDeduction: values.bankDeduction,
        destinationAccount: values.destinationAccount,
        proofUrl: values.proofUrl,
        notes: values.notes,
        createdBy: values.updatedBy,
      }).returning();
      await reduceProjectCredit(customer?.projectId, delta, `Akad cair #${akadId} ledger #${ledger.id}`, {
        unitId: customer?.unitId ?? unit?.id ?? null,
        stageCode: customer?.stageCode ?? unit?.stageCode ?? null,
        sourceId: ledger.id,
        transactionDate: values.tanggalCair,
      });
    }
    await writeAudit("finance", "akad_disbursement", akadId, "update_akad_cair", before, row, values.updatedBy, values.notes ?? undefined);
    res.json({ ...row, nominalCair: Number(row.nominalCair ?? 0), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/finance/akad-cair/:akadId/pencairan", async (req, res) => {
  try {
    const akadId = Number(req.params.akadId);
    const ledger = await db.select().from(financeAkadDisbursementLedgerTable)
      .where(eq(financeAkadDisbursementLedgerTable.akadId, akadId))
      .orderBy(financeAkadDisbursementLedgerTable.createdAt);
    res.json(ledger.map(l => ({ ...l, nominalCair: Number(l.nominalCair ?? 0), bankDeduction: Number(l.bankDeduction ?? 0), createdAt: l.createdAt.toISOString() })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/finance/akad-cair/:akadId/pencairan", async (req, res) => {
  try {
    const akadId = Number(req.params.akadId);
    const [akad] = await db.select().from(akadRecordsTable).where(eq(akadRecordsTable.id, akadId));
    if (!akad) return res.status(404).json({ error: "Akad tidak ditemukan" });
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, akad.customerId));
    const [unit] = customer?.unitId
      ? await db.select().from(unitsTable).where(eq(unitsTable.id, customer.unitId))
      : [];
    const nominalBaru = Number(req.body.nominalCair ?? 0);
    if (nominalBaru <= 0) return res.status(400).json({ error: "Nominal harus lebih dari 0" });
    const existing = await db.select().from(akadDisbursementsTable).where(eq(akadDisbursementsTable.akadId, akadId));
    const totalSebelum = existing[0] ? Number(existing[0].nominalCair ?? 0) : 0;
    const totalBaru = totalSebelum + nominalBaru;
    const akadAmount = akad.akadAmount ? Number(akad.akadAmount) : 0;
    if (totalBaru > akadAmount) return res.status(400).json({ error: `Total pencairan (${totalBaru.toLocaleString()}) melebihi nilai akad (${akadAmount.toLocaleString()})` });
    let disbId: number;
    if (existing.length) {
      const [upd] = await db.update(akadDisbursementsTable).set({ nominalCair: String(totalBaru), updatedBy: req.body.createdBy ?? "finance" })
        .where(eq(akadDisbursementsTable.id, existing[0].id)).returning();
      disbId = upd.id;
    } else {
      const [ins] = await db.insert(akadDisbursementsTable).values({ akadId, customerId: akad.customerId, projectId: customer?.projectId ?? null, nominalCair: String(totalBaru), statusCair: "sebagian_cair", updatedBy: req.body.createdBy ?? "finance" }).returning();
      disbId = ins.id;
    }
    const [ledger] = await db.insert(financeAkadDisbursementLedgerTable).values({
      akadId, disbursementId: disbId, customerId: akad.customerId, projectId: customer?.projectId ?? null,
      tanggalCair: req.body.tanggalCair, nominalCair: String(nominalBaru),
      bankDeduction: String(Number(req.body.bankDeduction ?? 0)),
      destinationAccount: req.body.destinationAccount ?? null,
      proofUrl: req.body.proofUrl ?? null,
      notes: req.body.notes ?? null,
      createdBy: req.body.createdBy ?? "finance",
    }).returning();
    if (totalBaru >= akadAmount && akadAmount > 0) {
      await db.update(akadDisbursementsTable).set({ statusCair: "cair_penuh" }).where(eq(akadDisbursementsTable.id, disbId));
    }
    await reduceProjectCredit(customer?.projectId, nominalBaru, `Pencairan akad #${akadId} ledger #${ledger.id}`, {
      unitId: customer?.unitId ?? unit?.id ?? null,
      stageCode: customer?.stageCode ?? unit?.stageCode ?? null,
      sourceId: ledger.id,
      transactionDate: req.body.tanggalCair,
    });
    await writeAudit("finance", "akad_disbursement_ledger", akadId, "tambah_pencairan", null, ledger, req.body.createdBy ?? "finance");
    res.status(201).json({ ...ledger, nominalCair: Number(ledger.nominalCair ?? 0), createdAt: ledger.createdAt.toISOString() });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/finance/akad-cair/:akadId/lock", async (req, res) => {
  try {
    const akadId = Number(req.params.akadId);
    const [existing] = await db.select().from(akadDisbursementsTable).where(eq(akadDisbursementsTable.akadId, akadId));
    if (!existing) return res.status(404).json({ error: "Disbursement belum ada" });
    if (existing.lockedAt) return res.status(423).json({ error: "Akad cair sudah terkunci" });
    const [row] = await db.update(akadDisbursementsTable).set({ lockedAt: new Date(), lockedBy: req.body.lockedBy ?? "Finance" })
      .where(eq(akadDisbursementsTable.id, existing.id)).returning();
    await writeAudit("finance", "akad_disbursement", akadId, "lock", existing, row, req.body.lockedBy ?? "Finance");
    res.json({ ...row, nominalCair: Number(row.nominalCair ?? 0), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/finance/hutang/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(debtRecordsTable).where(eq(debtRecordsTable.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── PIUTANG CENTER ───────────────────────────────────────────────────────────
router.get("/finance/piutang", async (req, res) => {
  try {
    const today = new Date();
    const d30 = new Date(); d30.setDate(today.getDate() + 30);
    const d60 = new Date(); d60.setDate(today.getDate() + 60);
    const d90 = new Date(); d90.setDate(today.getDate() + 90);

    const records = await db.select().from(receivableRecordsTable).orderBy(receivableRecordsTable.dueDate);

    const byCategory: Record<string, { total: number; current: number; d30_60: number; d60_90: number; macet: number; items: any[] }> = {};
    let totalAll = 0;
    let macetTotal = 0;

    for (const r of records) {
      const amt = Number(r.totalAmount);
      const due = r.dueDate ? new Date(r.dueDate) : null;
      const cat = r.category;
      if (!byCategory[cat]) byCategory[cat] = { total: 0, current: 0, d30_60: 0, d60_90: 0, macet: 0, items: [] };
      byCategory[cat].total += amt;
      totalAll += amt;
      if (due && due < today) {
        const daysOverdue = Math.floor((today.getTime() - due.getTime()) / 86400000);
        if (daysOverdue > 90) { byCategory[cat].macet += amt; macetTotal += amt; }
        else if (daysOverdue > 60) byCategory[cat].d60_90 += amt;
        else byCategory[cat].d30_60 += amt;
      } else byCategory[cat].current += amt;
      byCategory[cat].items.push(r);
    }

    res.json({ byCategory, total: totalAll, macetTotal, records });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/finance/piutang", async (req, res) => {
  try {
    const { debtorName, category, totalAmount, dueDate, notes } = req.body;
    const [row] = await db.insert(receivableRecordsTable).values({ debtorName, category, totalAmount: String(totalAmount), dueDate, notes, status: "current" }).returning();
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── RAB / PROJECT FINANCE ────────────────────────────────────────────────────
router.get("/finance/rab", async (req, res) => {
  try {
    const projects = await db.select().from(projectsTable);
    const activeProjectNames = new Set(projects.filter(isOperationalProject).map((project) => normalizeProjectName(project.nama)));
    const excludedProjectNames = new Set(projects.filter((project) => !isOperationalProject(project)).map((project) => normalizeProjectName(project.nama)));
    const items = scopedByProjectName(
      await db.select().from(rabItemsTable).orderBy(rabItemsTable.projectName, rabItemsTable.stageCode),
      activeProjectNames,
      excludedProjectNames,
    );

    const byProject: Record<string, { rab: number; realisasi: number; stages: Record<string, any[]> }> = {};
    for (const item of items) {
      const p = item.projectName;
      if (!byProject[p]) byProject[p] = { rab: 0, realisasi: 0, stages: {} };
      const rab = Number(item.rabAmount);
      const real = Number(item.realizationAmount ?? 0);
      byProject[p].rab += rab;
      byProject[p].realisasi += real;
      const stage = item.stageCode ?? "Umum";
      if (!byProject[p].stages[stage]) byProject[p].stages[stage] = [];
      byProject[p].stages[stage].push({ ...item, rab, realisasi: real, deviasi: real - rab, deviasiPct: rab > 0 ? ((real - rab) / rab) * 100 : 0 });
    }

    const summary = Object.entries(byProject).map(([name, d]) => ({
      projectName: name, rab: d.rab, realisasi: d.realisasi,
      deviasi: d.realisasi - d.rab,
      deviasiPct: d.rab > 0 ? ((d.realisasi - d.rab) / d.rab) * 100 : 0,
      stages: d.stages,
    }));

    res.json({ summary, items });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── PROFITABILITAS ───────────────────────────────────────────────────────────
router.get("/finance/profitabilitas", async (req, res) => {
  try {
    const projectsRaw = await db.select().from(projectsTable);
    const activeProjectNames = new Set(projectsRaw.filter(isOperationalProject).map((project) => normalizeProjectName(project.nama)));
    const excludedProjectNames = new Set(projectsRaw.filter((project) => !isOperationalProject(project)).map((project) => normalizeProjectName(project.nama)));
    const cashflowData = scopedByProjectName(await db.select().from(cashflowRecordsTable), activeProjectNames, excludedProjectNames);

    const byProject: Record<string, { pendapatan: number; biaya: number }> = {};
    for (const row of cashflowData) {
      const p = row.projectName ?? "Tanpa Proyek";
      if (!byProject[p]) byProject[p] = { pendapatan: 0, biaya: 0 };
      if (row.type === "cash_in") byProject[p].pendapatan += Number(row.amount);
      else byProject[p].biaya += Number(row.amount);
    }

    const projects = Object.entries(byProject).map(([name, d]) => ({
      projectName: name,
      pendapatan: d.pendapatan, biaya: d.biaya,
      profit: d.pendapatan - d.biaya,
      margin: d.pendapatan > 0 ? ((d.pendapatan - d.biaya) / d.pendapatan) * 100 : 0,
    })).sort((a, b) => b.profit - a.profit);

    res.json({ projects });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── FORECAST ─────────────────────────────────────────────────────────────────
router.get("/finance/forecast", async (req, res) => {
  try {
    const today = new Date();
    const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
    const projects = await db.select().from(projectsTable);
    const activeProjectNames = new Set(projects.filter(isOperationalProject).map((project) => normalizeProjectName(project.nama)));
    const excludedProjectNames = new Set(projects.filter((project) => !isOperationalProject(project)).map((project) => normalizeProjectName(project.nama)));

    const [receivables, rawDebts, rawKpps, payments] = await Promise.all([
      db.select().from(receivableRecordsTable).where(eq(receivableRecordsTable.status, "current")),
      db.select().from(debtRecordsTable).where(eq(debtRecordsTable.status, "outstanding")),
      db.select().from(kppFacilitiesTable).where(eq(kppFacilitiesTable.isActive, true)),
      db.select({ kppId: kppPaymentsTable.kppId, total: sql<number>`coalesce(sum(principal_paid::numeric),0)` })
        .from(kppPaymentsTable).groupBy(kppPaymentsTable.kppId),
    ]);
    const debts = scopedByProjectName(rawDebts, activeProjectNames, excludedProjectNames);
    const kpps = scopedByProjectName(rawKpps, activeProjectNames, excludedProjectNames);

    const payMap: Record<number, number> = {};
    for (const p of payments) payMap[p.kppId] = Number(p.total);

    const totalKppMonthly = kpps.reduce((s, k) => {
      const outstanding = Number(k.plafon) - (payMap[k.id] ?? 0);
      const remaining = k.tenorMonths ? Math.max(1, k.tenorMonths - Math.floor((Date.now() - (k.firstDisbursementDate ? new Date(k.firstDisbursementDate).getTime() : Date.now())) / (30 * 86400000))) : 12;
      return s + (outstanding / remaining);
    }, 0);

    const forecastMonths = [];
    let cumulative = 0;

    for (let i = 0; i < 6; i++) {
      const d = new Date(today); d.setMonth(today.getMonth() + i + 1);
      const monthStr = d.toISOString().split("T")[0].slice(0, 7);

      const forecastIn = receivables
        .filter(r => r.dueDate && r.dueDate.startsWith(monthStr))
        .reduce((s, r) => s + Number(r.totalAmount), 0);

      const forecastOut = debts
        .filter(r => r.dueDate && r.dueDate.startsWith(monthStr))
        .reduce((s, r) => s + Number(r.remainingAmount ?? r.totalAmount), 0) + totalKppMonthly;

      const net = forecastIn - forecastOut;
      cumulative += net;
      forecastMonths.push({
        bulan: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
        forecastIn, forecastOut, net, cumulative,
      });
    }

    const hasNegative = forecastMonths.some(m => m.net < 0);
    res.json({ forecastMonths, hasNegative });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── ACCOUNTING CENTER ────────────────────────────────────────────────────────
router.get("/finance/accounting", async (req, res) => {
  try {
    const { year = new Date().getFullYear(), month } = req.query;

    let whereClause = sql`EXTRACT(YEAR FROM transaction_date) = ${Number(year)}`;
    if (month) whereClause = and(whereClause, sql`EXTRACT(MONTH FROM transaction_date) = ${Number(month)}`) as any;

    const records = await db.select({
      type: cashflowRecordsTable.type,
      category: cashflowRecordsTable.category,
      total: sql<number>`coalesce(sum(amount::numeric),0)`,
    }).from(cashflowRecordsTable).where(whereClause).groupBy(cashflowRecordsTable.type, cashflowRecordsTable.category);

    let pendapatan = 0, hpp = 0, bebanOps = 0;
    for (const r of records) {
      const amt = Number(r.total);
      if (r.type === "cash_in") {
        if (["dp","akad","ht","sbum","penjualan"].includes(r.category)) pendapatan += amt;
      } else {
        if (["material","subkon","vendor"].includes(r.category)) hpp += amt;
        else bebanOps += amt;
      }
    }

    const labaKotor = pendapatan - hpp;
    const labaOps = labaKotor - bebanOps;
    const pajak = Math.max(0, labaOps * 0.25);
    const labaBersih = labaOps - pajak;

    const [debts, receivables] = await Promise.all([
      db.select({ total: sql<number>`coalesce(sum(coalesce(remaining_amount,total_amount)::numeric),0)` }).from(debtRecordsTable).where(eq(debtRecordsTable.status, "outstanding")),
      db.select({ total: sql<number>`coalesce(sum(total_amount::numeric),0)` }).from(receivableRecordsTable),
    ]);

    const kewajiban = Number(debts[0]?.total ?? 0);
    const piutang = Number(receivables[0]?.total ?? 0);
    const kas = pendapatan - hpp - bebanOps;

    res.json({
      labaRugi: { pendapatan, hpp, labaKotor, bebanOps, labaOps, pajak, labaBersih },
      neraca: {
        kasBank: Math.max(0, kas),
        piutang,
        totalAset: Math.max(0, kas) + piutang,
        kewajibanLancar: kewajiban,
        ekuitas: Math.max(0, kas) + piutang - kewajiban,
      },
      arusKas: {
        operasional: labaBersih,
        investasi: 0,
        pendanaan: 0,
        netKas: labaBersih,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── AUDIT CENTER ─────────────────────────────────────────────────────────────
router.get("/finance/audit", async (req, res) => {
  try {
    const findings = await db.select().from(auditFindingsTable).orderBy(desc(auditFindingsTable.createdAt));
    const stats = {
      total: findings.length,
      baru: findings.filter(f => f.status === "baru").length,
      belumSelesai: findings.filter(f => f.status !== "diselesaikan").length,
      totalNilai: findings.reduce((s, f) => s + Number(f.amount ?? 0), 0),
    };
    res.json({ findings, stats });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/finance/audit/:id", async (req, res) => {
  try {
    const { status, resolutionNotes, reviewedBy } = req.body;
    const [row] = await db.update(auditFindingsTable)
      .set({ status, resolutionNotes, reviewedBy, reviewedAt: status !== "baru" ? new Date() : undefined })
      .where(eq(auditFindingsTable.id, Number(req.params.id)))
      .returning();
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── EARLY WARNING ────────────────────────────────────────────────────────────
router.get("/finance/warning", async (req, res) => {
  try {
    const alerts = await db.select().from(financeAlertsTable).orderBy(
      sql`CASE level WHEN 'kritis' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END`,
      desc(financeAlertsTable.createdAt)
    );
    const unread = alerts.filter(a => !a.isRead).length;
    res.json({ alerts, unread });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/finance/warning/:id/read", async (req, res) => {
  try {
    const [row] = await db.update(financeAlertsTable)
      .set({ isRead: true, actionNotes: req.body.actionNotes })
      .where(eq(financeAlertsTable.id, Number(req.params.id)))
      .returning();
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/finance/warning", async (req, res) => {
  try {
    const { alertType, level, message, amount, relatedModule } = req.body;
    const [row] = await db.insert(financeAlertsTable).values({ alertType, level, message, amount: amount ? String(amount) : null, relatedModule }).returning();
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── EXPANSION ANALYSIS ───────────────────────────────────────────────────────
router.get("/finance/ekspansi", async (req, res) => {
  try {
    const analyses = await db.select().from(expansionAnalysesTable).orderBy(desc(expansionAnalysesTable.createdAt));
    res.json(analyses);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/finance/ekspansi/analisis", async (req, res) => {
  try {
    const { scenarioName, scenarioType, inputData } = req.body;

    const [kpps, payments, cashflowData, debts, receivables] = await Promise.all([
      db.select().from(kppFacilitiesTable).where(eq(kppFacilitiesTable.isActive, true)),
      db.select({ kppId: kppPaymentsTable.kppId, total: sql<number>`coalesce(sum(principal_paid::numeric),0)` })
        .from(kppPaymentsTable).groupBy(kppPaymentsTable.kppId),
      db.select({ type: cashflowRecordsTable.type, total: sql<number>`coalesce(sum(amount::numeric),0)` })
        .from(cashflowRecordsTable)
        .where(sql`EXTRACT(YEAR FROM transaction_date) = ${new Date().getFullYear()}`)
        .groupBy(cashflowRecordsTable.type),
      db.select({ total: sql<number>`coalesce(sum(coalesce(remaining_amount,total_amount)::numeric),0)` }).from(debtRecordsTable).where(eq(debtRecordsTable.status, "outstanding")),
      db.select({ total: sql<number>`coalesce(sum(total_amount::numeric),0)` }).from(receivableRecordsTable),
    ]);

    const payMap: Record<number, number> = {};
    for (const p of payments) payMap[p.kppId] = Number(p.total);
    let totalKppOutstanding = 0;
    for (const k of kpps) totalKppOutstanding += Number(k.plafon) - (payMap[k.id] ?? 0);

    const cashIn = Number(cashflowData.find(c => c.type === "cash_in")?.total ?? 0);
    const cashOut = Number(cashflowData.find(c => c.type === "cash_out")?.total ?? 0);
    const monthlyNetCashflow = (cashIn - cashOut) / 12;
    const totalDebt = Number(debts[0]?.total ?? 0);
    const totalReceivable = Number(receivables[0]?.total ?? 0);

    const deepseek = createDeepSeekClient();
    const prompt = scenarioType === "kpp_baru"
      ? `Analisis kelayakan pengambilan KPP baru untuk Satara Development.

DATA KEUANGAN TERKINI:
- Outstanding KPP existing: Rp ${(totalKppOutstanding / 1e9).toFixed(2)} M
- Net cashflow rata-rata per bulan (tahun ini): Rp ${(monthlyNetCashflow / 1e6).toFixed(0)} Jt
- Total hutang outstanding: Rp ${(totalDebt / 1e9).toFixed(2)} M
- Total piutang: Rp ${(totalReceivable / 1e6).toFixed(0)} Jt

SKENARIO YANG DIANALISIS:
- Proyek: ${inputData.projectName}
- Nilai KPP yang diajukan: Rp ${Number(inputData.nilaiKpp).toLocaleString("id-ID")}
- Estimasi jangka waktu: ${inputData.tenorBulan} bulan
- Bank yang dituju: ${inputData.bankTarget}

Berikan analisis singkat: verdict (AMAN/PERLU PERHATIAN/TIDAK DISARANKAN), lalu 3-5 poin analisis dalam Bahasa Indonesia. Format: verdict di baris pertama, lalu poin-poin.`
      : `Analisis kapasitas ekspansi proyek baru Satara Development.

DATA KEUANGAN TERKINI:
- Net cashflow rata-rata per bulan: Rp ${(monthlyNetCashflow / 1e6).toFixed(0)} Jt
- Total hutang: Rp ${(totalDebt / 1e9).toFixed(2)} M
- Outstanding KPP: Rp ${(totalKppOutstanding / 1e9).toFixed(2)} M

SKENARIO EKSPANSI:
- Nama Proyek: ${inputData.namaProyek}
- Estimasi total investasi: Rp ${Number(inputData.totalInvestasi).toLocaleString("id-ID")}
- Estimasi pendapatan per tahun: Rp ${Number(inputData.pendapatanPerTahun).toLocaleString("id-ID")}
- Estimasi biaya operasional per tahun: Rp ${Number(inputData.biayaPerTahun).toLocaleString("id-ID")}

Hitung ROI, payback period, dan dampak ke cashflow existing. Berikan verdict (LAYAK/BERISIKO/TIDAK LAYAK) dan 3-5 poin analisis dalam Bahasa Indonesia.`;

    const response = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: SATARA_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      max_tokens: 600,
    });

    const aiOutput = response.choices[0]?.message?.content ?? "";
    const firstLine = aiOutput.split("\n")[0].toUpperCase();
    const verdict = firstLine.includes("AMAN") ? "AMAN"
      : firstLine.includes("LAYAK") ? "LAYAK"
      : firstLine.includes("TIDAK") ? "TIDAK DISARANKAN"
      : "PERLU PERHATIAN";

    const [saved] = await db.insert(expansionAnalysesTable).values({
      scenarioName, scenarioType, inputData, aiOutput, aiVerdict: verdict,
    }).returning();

    res.json(saved);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── AI FINANCE DASHBOARD RECOMMENDATION ─────────────────────────────────────
router.post("/finance/ai-recommendation", async (req, res) => {
  try {
    const { netCashflow, outstandingKpp, totalHutang, piutangMacet, marginProyek } = req.body;

    const deepseek = createDeepSeekClient();
    const response = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: SATARA_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Berikut data keuangan Satara Development bulan ini:
- Net Cashflow: Rp ${(Number(netCashflow) / 1e6).toFixed(0)} Jt ${Number(netCashflow) >= 0 ? "(positif)" : "(negatif)"}
- Outstanding KPP: Rp ${(Number(outstandingKpp) / 1e9).toFixed(2)} M
- Total Hutang Outstanding: Rp ${(Number(totalHutang) / 1e9).toFixed(2)} M
- Piutang Macet (>90 hari): Rp ${(Number(piutangMacet) / 1e6).toFixed(0)} Jt
- Rata-rata Margin Proyek: ${Number(marginProyek).toFixed(1)}%

Berikan Finance Health Score dari 0-100 dan 3 rekomendasi strategis singkat dalam Bahasa Indonesia. Format: skor di baris pertama (angka saja), lalu 3 poin rekomendasi.`,
        },
      ],
      max_tokens: 400,
    });

    const text = response.choices[0]?.message?.content ?? "";
    const lines = text.split("\n").filter(l => l.trim());
    const score = parseInt(lines[0]) || 75;
    const recommendations = lines.slice(1).filter(l => l.trim()).slice(0, 3);

    res.json({ score, recommendations });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── AUTOCOMPLETE (distinct field values for history suggestions) ─────────────
router.get("/finance/autocomplete", async (req, res) => {
  try {
    const type = String(req.query.type ?? "");
    const field = String(req.query.field ?? "");
    let values: string[] = [];
    if (type === "hutang") {
      if (field === "projectName") {
        const r = await db.selectDistinct({ v: debtRecordsTable.projectName }).from(debtRecordsTable).where(sql`project_name is not null and project_name != ''`).limit(60);
        values = r.map(x => x.v!).filter(Boolean);
      } else if (field === "creditorName") {
        const r = await db.selectDistinct({ v: debtRecordsTable.creditorName }).from(debtRecordsTable).limit(60);
        values = r.map(x => x.v).filter(v => v && v !== "Tidak diketahui");
      } else if (field === "stageInfo") {
        const r = await db.selectDistinct({ v: debtRecordsTable.stageInfo }).from(debtRecordsTable).where(sql`stage_info is not null and stage_info != ''`).limit(30);
        values = r.map(x => x.v!).filter(Boolean);
      }
    } else if (["cashflow", "general_ledger", "bank"].includes(type)) {
      if (field === "projectName") {
        const r = await db.selectDistinct({ v: cashflowRecordsTable.projectName }).from(cashflowRecordsTable).where(sql`project_name is not null and project_name != ''`).limit(60);
        values = r.map(x => x.v!).filter(Boolean);
      } else if (field === "category") {
        const r = await db.selectDistinct({ v: cashflowRecordsTable.category }).from(cashflowRecordsTable).limit(30);
        values = r.map(x => x.v).filter(Boolean);
      } else if (field === "description") {
        const r = await db.selectDistinct({ v: cashflowRecordsTable.description }).from(cashflowRecordsTable).where(sql`description is not null and description != ''`).limit(40);
        values = r.map(x => x.v!).filter(Boolean);
      }
    } else if (type === "piutang") {
      if (field === "debtorName") {
        const r = await db.selectDistinct({ v: receivableRecordsTable.debtorName }).from(receivableRecordsTable).limit(60);
        values = r.map(x => x.v).filter(Boolean);
      } else if (field === "category") {
        const r = await db.selectDistinct({ v: receivableRecordsTable.category }).from(receivableRecordsTable).limit(20);
        values = r.map(x => x.v).filter(Boolean);
      }
    } else if (type === "rab") {
      if (field === "projectName") {
        const r = await db.selectDistinct({ v: rabItemsTable.projectName }).from(rabItemsTable).limit(60);
        values = r.map(x => x.v).filter(Boolean);
      } else if (field === "stageCode") {
        const r = await db.selectDistinct({ v: rabItemsTable.stageCode }).from(rabItemsTable).where(sql`stage_code is not null and stage_code != ''`).limit(20);
        values = r.map(x => x.v!).filter(Boolean);
      } else if (field === "itemName") {
        const r = await db.selectDistinct({ v: rabItemsTable.itemName }).from(rabItemsTable).limit(60);
        values = r.map(x => x.v).filter(Boolean);
      } else if (field === "itemCategory") {
        const r = await db.selectDistinct({ v: rabItemsTable.itemCategory }).from(rabItemsTable).where(sql`item_category is not null and item_category != ''`).limit(20);
        values = r.map(x => x.v!).filter(Boolean);
      }
    }
    res.json(values.sort().slice(0, 30));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── MANUAL SAVE (simpan entri manual langsung ke DB) ─────────────────────────
router.post("/finance/uploads/manual-save", async (req, res) => {
  try {
    const { fileType, entries, sessionName } = req.body as { fileType: string; entries: any[]; sessionName?: string };
    if (!entries?.length) { res.status(400).json({ error: "Tidak ada entri" }); return; }
    const now = new Date();
    const label = sessionName || `Manual ${now.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}`;
    function cn2(v: any): number {
      return parseFinanceNumber(v);
    }
    const [log] = await db.insert(financeUploadsTable).values({
      fileType, fileName: label, periodYear: now.getFullYear(), periodMonth: now.getMonth() + 1,
      rowCount: entries.length, status: "berhasil",
    }).returning();
    const uploadId = log.id;
    let inserted = 0;
    if (fileType === "hutang") {
      const rows = entries.map((e: any) => {
        const orig = cn2(e.totalAmount); const paid = cn2(e.paidAmount);
        const rem = cn2(e.remainingAmount) || Math.max(0, orig - paid);
        if (!e.creditorName && orig === 0) return null;
        return { uploadId, projectName: e.projectName || null, stageInfo: e.stageInfo || null,
          creditorName: String(e.creditorName || "Tidak diketahui").trim(), category: "supplier",
          totalAmount: String(orig), paidAmount: String(paid), remainingAmount: String(rem),
          landArea: e.landArea === "" || e.landArea === null || e.landArea === undefined ? null : String(cn2(e.landArea)),
          status: rem <= 0 ? "paid" : "outstanding", notes: e.notes || "" };
      }).filter(Boolean);
      if (rows.length) { inserted = (await db.insert(debtRecordsTable).values(rows as any).returning()).length; }
    } else if (fileType === "piutang") {
      const rows = entries.map((e: any) => {
        const amt = cn2(e.totalAmount);
        if (!e.debtorName && amt === 0) return null;
        return { uploadId, debtorName: String(e.debtorName || ""), category: e.category || "customer", totalAmount: String(amt), dueDate: e.dueDate || null, status: "current", notes: e.notes || "" };
      }).filter(Boolean);
      if (rows.length) { inserted = (await db.insert(receivableRecordsTable).values(rows as any).returning()).length; }
    } else if (["cashflow", "general_ledger", "bank"].includes(fileType)) {
      const rows = entries.map((e: any) => {
        const amt = cn2(e.amount);
        if (!e.transactionDate && amt === 0) return null;
        return { uploadId, transactionDate: e.transactionDate || now.toISOString().split("T")[0], type: inferCashflowType(e.type, amt), category: String(e.category || "lainnya"), projectName: String(e.projectName || ""), amount: String(Math.abs(amt)), description: String(e.description || ""), referenceNumber: String(e.referenceNumber || "") };
      }).filter(Boolean);
      if (rows.length) { inserted = (await db.insert(cashflowRecordsTable).values(rows as any).returning()).length; }
    } else if (fileType === "rab") {
      const rows = entries.map((e: any) => {
        const rab = cn2(e.rabAmount);
        if (!e.itemName && rab === 0) return null;
        return { uploadId, projectName: String(e.projectName || ""), stageCode: String(e.stageCode || ""), itemName: String(e.itemName || ""), itemCategory: String(e.itemCategory || ""), rabAmount: String(rab), realizationAmount: String(cn2(e.realizationAmount)) };
      }).filter(Boolean);
      if (rows.length) { inserted = (await db.insert(rabItemsTable).values(rows as any).returning()).length; }
    }
    res.json({ inserted, uploadId });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── AI VERIFY (bandingkan manual entries vs isi dokumen) ─────────────────────
router.post("/finance/uploads/ai-verify", async (req, res) => {
  try {
    const { fileType, manualEntries, fileName, fileKind, sheets, pdfBase64 } = req.body as {
      fileType: string;
      manualEntries: Record<string, any>[];
      fileName: string;
      fileKind: "excel" | "pdf";
      sheets?: Array<{ name: string; headers: string[]; rows: Record<string, any>[] }>;
      pdfBase64?: string;
    };

    function cn(v: any): number {
      if (!v && v !== 0) return 0;
      if (typeof v === "number") return v;
      const s = String(v).replace(/Rp\.?\s*/gi, "").replace(/\./g, "").replace(/,/g, ".");
      return parseFloat(s) || 0;
    }
    function fmtRp(n: number): string {
      if (!n || isNaN(n)) return "Rp 0";
      if (Math.abs(n) >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
      if (Math.abs(n) >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)} Jt`;
      return `Rp ${n.toLocaleString("id-ID")}`;
    }
    function pct(diff: number, base: number): string {
      if (!base) return "";
      return ` (${Math.abs(diff / base * 100).toFixed(1)}%)`;
    }
    function approxEq(a: number, b: number): boolean {
      if (a === 0 && b === 0) return true;
      const base = Math.max(Math.abs(a), Math.abs(b), 1);
      return Math.abs(a - b) / base < 0.02; // 2% tolerance
    }

    // ── Hitung totals dari manual entries ──────────────────────────────────────
    type CheckItem = { label: string; manualVal: number; key: string };
    const checks: CheckItem[] = [];

    if (fileType === "hutang") {
      const total = manualEntries.reduce((s, r) => s + cn(r.totalAmount), 0);
      const paid = manualEntries.reduce((s, r) => s + cn(r.paidAmount), 0);
      checks.push({ label: "Total Nilai Hutang (Rp)", manualVal: total, key: "totalHutang" });
      checks.push({ label: "Total Terbayar (Rp)", manualVal: paid, key: "totalPaid" });
      checks.push({ label: "Jumlah Entri Kreditur", manualVal: manualEntries.length, key: "countEntri" });
    } else if (fileType === "piutang") {
      const total = manualEntries.reduce((s, r) => s + cn(r.totalAmount), 0);
      checks.push({ label: "Total Piutang (Rp)", manualVal: total, key: "totalPiutang" });
      checks.push({ label: "Jumlah Entri Debitur", manualVal: manualEntries.length, key: "countEntri" });
    } else if (["cashflow", "general_ledger", "bank"].includes(fileType)) {
      const cashIn = manualEntries.filter(r => r.type === "cash_in").reduce((s, r) => s + cn(r.amount), 0);
      const cashOut = manualEntries.filter(r => r.type === "cash_out").reduce((s, r) => s + cn(r.amount), 0);
      checks.push({ label: "Total Masuk / Cash In (Rp)", manualVal: cashIn, key: "cashIn" });
      checks.push({ label: "Total Keluar / Cash Out (Rp)", manualVal: cashOut, key: "cashOut" });
      checks.push({ label: "Net Cashflow (Rp)", manualVal: cashIn - cashOut, key: "net" });
      checks.push({ label: "Jumlah Transaksi", manualVal: manualEntries.length, key: "countEntri" });
    } else if (fileType === "rab") {
      const anggaran = manualEntries.reduce((s, r) => s + cn(r.rabAmount), 0);
      const realisasi = manualEntries.reduce((s, r) => s + cn(r.realizationAmount), 0);
      checks.push({ label: "Total Anggaran RAB (Rp)", manualVal: anggaran, key: "totalAnggaran" });
      checks.push({ label: "Total Realisasi (Rp)", manualVal: realisasi, key: "totalRealisasi" });
      checks.push({ label: "Jumlah Item", manualVal: manualEntries.length, key: "countEntri" });
    }

    if (!checks.length) {
      res.status(400).json({ error: "Tipe data tidak dikenali untuk verifikasi" });
      return;
    }

    // ── Siapkan dokumen teks untuk AI ──────────────────────────────────────────
    let docText = "";
    const ai = createDeepSeekClient();

    if (fileKind === "pdf" && pdfBase64) {
      const buf = Buffer.from(pdfBase64, "base64");
      const parsed = await pdfParse(buf);
      docText = (parsed.text || "").slice(0, 14000);
    } else if (fileKind === "excel" && sheets?.length) {
      const allRows = sheets.flatMap(sh =>
        sh.rows.map(row => sh.headers.map(h => String(row[h] ?? "")).join("\t"))
      );
      const headerLine = sheets[0]?.headers.join("\t") ?? "";
      docText = [headerLine, ...allRows].slice(0, 600).join("\n");
      if (docText.length > 14000) docText = docText.slice(0, 14000);
    }

    if (!docText.trim()) {
      res.status(400).json({ error: "Dokumen kosong atau tidak bisa dibaca." });
      return;
    }

    // ── AI ekstrak angka yang sama dari dokumen ────────────────────────────────
    const targetKeys = checks.map(c => c.key);
    const targetDesc = checks.map(c => `"${c.key}": <angka numerik untuk ${c.label}>`).join(", ");

    const completion = await ai.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: "system",
          content: "Kamu adalah asisten keuangan. Ekstrak angka-angka summary dari dokumen. Kembalikan JSON object saja, tanpa penjelasan.",
        },
        {
          role: "user",
          content: `Dari dokumen keuangan berikut (tipe: ${fileType}), ekstrak nilai-nilai ini:\n${targetDesc}\n\nUntuk "countEntri": hitung jumlah baris data (bukan header, bukan total/subtotal).\nUntuk angka Rupiah: kembalikan angka saja tanpa "Rp" atau titik/koma pemisah ribuan.\n\nDOKUMEN:\n${docText}\n\nKembalikan JSON: {${targetKeys.map(k => `"${k}": number`).join(", ")}}`,
        },
      ],
      temperature: 0,
      max_tokens: 300,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const m = raw.match(/\{[\s\S]*\}/);
    let docVals: Record<string, number> = {};
    try { docVals = m ? JSON.parse(m[0]) : {}; } catch { docVals = {}; }

    // ── Bandingkan ────────────────────────────────────────────────────────────
    type VerifyCheck = { label: string; manualValue: string; docValue: string; match: boolean; diff?: string; };
    const result: VerifyCheck[] = checks.map(c => {
      const docVal = typeof docVals[c.key] === "number" ? docVals[c.key] : null;
      const isCount = c.key === "countEntri";
      const manualFmt = isCount ? `${c.manualVal} baris` : fmtRp(c.manualVal);
      const docFmt = docVal === null ? "Tidak ditemukan" : isCount ? `${docVal} baris` : fmtRp(docVal);
      const match = docVal !== null && approxEq(c.manualVal, docVal);
      const diff = docVal !== null && !match
        ? (isCount ? `Selisih ${Math.abs(c.manualVal - docVal)} baris` : `Selisih ${fmtRp(Math.abs(c.manualVal - docVal))}${pct(c.manualVal - docVal, c.manualVal)}`)
        : undefined;
      return { label: c.label, manualValue: manualFmt, docValue: docFmt, match, diff };
    });

    const matchCount = result.filter(r => r.match).length;
    const totalCount = result.length;
    const allMatch = matchCount === totalCount;
    const summary = allMatch
      ? "Semua item cocok antara input manual dan dokumen bukti."
      : `${totalCount - matchCount} item tidak cocok — periksa selisih sebelum menyimpan.`;

    res.json({ checks: result, summary, matchCount, totalCount });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── AI PREVIEW (baca dokumen, kembalikan records TANPA save) ─────────────────
router.post("/finance/uploads/ai-preview", async (req, res) => {
  try {
    const { fileType, fileName, sheets, fileKind } = req.body as {
      fileType: string; fileName: string; fileKind: "excel";
      sheets?: Array<{ name: string; headers: string[]; rows: Record<string, any>[] }>;
    };
    const SUMMARY_RE = /^(grand\s*total|sub\s*total|subtotal|total|jumlah|rekapitulasi|rekap)$/i;
    const SUMMARY_TEXT_RE = /(grand\s*total|sub\s*total|subtotal|total|jumlah|rekapitulasi|rekap|tunggu\s+siteplan)/i;
    let records: any[] = [];
    let colMap: Record<string, string | null> = {};

    if (fileKind !== "excel") {
      res.status(400).json({ error: "Upload Finance sekarang hanya menerima Excel (.xlsx, .xls, .csv)." });
      return;
    }

    if (fileKind === "excel" && sheets?.length) {
      const targetFields =
        fileType === "hutang" ? ["projectName", "stageInfo", "creditorName", "totalAmount", "paidAmount", "remainingAmount", "landArea", "notes"] :
        fileType === "piutang" ? ["debtorName", "category", "totalAmount", "dueDate", "notes"] :
        ["cashflow", "general_ledger", "bank"].includes(fileType) ? ["transactionDate", "type", "category", "projectName", "amount", "description", "referenceNumber"] :
        fileType === "rab" ? ["projectName", "stageCode", "itemName", "itemCategory", "rabAmount", "realizationAmount"] :
        [];

      function hasRequiredColumns(map: Record<string, string | null>) {
        if (fileType === "hutang") return !!map.creditorName && (!!map.totalAmount || !!map.remainingAmount);
        if (fileType === "piutang") return !!map.debtorName && !!map.totalAmount;
        if (["cashflow", "general_ledger", "bank"].includes(fileType)) return !!map.amount || (!!map.description && !!map.transactionDate);
        if (fileType === "rab") return !!map.itemName && !!map.rabAmount;
        return false;
      }

      async function mapSheetColumns(sheet: { name: string; headers: string[]; rows: Record<string, any>[] }) {
        let map = deterministicColumnMap(sheet.headers, targetFields);
        if (hasRequiredColumns(map) || !targetFields.length) return map;
        try {
          const ai = createDeepSeekClient();
          const mappingResp = await ai.chat.completions.create({
            model: DEEPSEEK_MODEL,
            messages: [
              { role: "system", content: "Kembalikan hanya JSON object yang valid, tanpa penjelasan." },
              { role: "user", content: `Deteksi mapping kolom Excel ke field target untuk sheet "${sheet.name}".\nHEADERS: ${JSON.stringify(sheet.headers)}\nSAMPLE: ${JSON.stringify(sheet.rows.slice(0, 3), null, 2)}\nField target: ${targetFields.join(", ")}\nKembalikan: {"targetField":"ExcelColumnName",...}` },
            ],
            temperature: 0, max_tokens: 400,
          });
          const raw = mappingResp.choices[0]?.message?.content ?? "{}";
          const m = raw.match(/\{[\s\S]*\}/);
          const aiMap = (m ? JSON.parse(m[0]) : {}) as Record<string, unknown>;
          const cleanAiMap = Object.fromEntries(Object.entries(aiMap).filter(([, v]) => typeof v === "string" && v)) as Record<string, string>;
          map = { ...map, ...cleanAiMap };
        } catch {
          // Deterministic mapping remains the source of truth when AI fallback is unavailable.
        }
        return map;
      }

      const sheetMaps = await Promise.all(sheets.map(async sh => ({ sheet: sh, colMap: await mapSheetColumns(sh) })));
      colMap = sheetMaps.find(m => hasRequiredColumns(m.colMap))?.colMap ?? sheetMaps[0]?.colMap ?? {};

      function findColP(keys: string[], kws: string[]): string | null {
        const normalized = keys.map(k => normalizeFinanceHeader(k));
        for (const kw of kws) {
          const alias = normalizeFinanceHeader(kw);
          const i = normalized.findIndex(k => k === alias || k.includes(alias) || alias.includes(k));
          if (i !== -1) return keys[i];
        }
        return null;
      }
      function getValP(row: Record<string, any>, rowColMap: Record<string, string | null>, field: string, fbs: string[] = []): any {
        const col = rowColMap[field]; if (col && row[col] !== undefined && row[col] !== "") return row[col];
        const aliases = [...(FINANCE_FIELD_ALIASES[field] ?? []), ...fbs];
        for (const k of aliases) { const f = findColP(Object.keys(row), [k]); if (f && row[f] !== undefined && row[f] !== "") return row[f]; }
        return null;
      }
      const allRows = sheetMaps
        .filter(({ colMap: sheetColMap }) => hasRequiredColumns(sheetColMap))
        .flatMap(({ sheet, colMap: sheetColMap }) => sheet.rows.map(r => ({ ...r, _sheet: sheet.name, _colMap: sheetColMap })));
      if (fileType === "hutang") {
        records = allRows.map(row => {
          const rowColMap = row._colMap as Record<string, string | null>;
          const creditor = getValP(row, rowColMap, "creditorName", ["pemilik", "kreditur", "vendor"]);
          const rowText = Object.values(row).map(v => String(v ?? "")).join(" ");
          if (!creditor || SUMMARY_RE.test(String(creditor).trim()) || SUMMARY_TEXT_RE.test(rowText) && !String(creditor).trim().match(/[A-Z]/i)) return null;
          const orig = parseFinanceNumber(getValP(row, rowColMap, "totalAmount", ["awal", "total", "nilai"]));
          const paid = parseFinanceNumber(getValP(row, rowColMap, "paidAmount", ["terbayar", "bayar"]));
          const remRaw = getValP(row, rowColMap, "remainingAmount", ["sisa"]);
          const rem = remRaw === null || remRaw === "" ? Math.max(0, orig - paid) : parseFinanceNumber(remRaw);
          const landArea = parseFinanceNumber(getValP(row, rowColMap, "landArea", ["luas"]));
          if (orig === 0 && !creditor) return null;
          return { projectName: String(getValP(row, rowColMap, "projectName", ["proyek"]) ?? "").trim() || null, stageInfo: String(getValP(row, rowColMap, "stageInfo", ["tahap"]) ?? "").trim() || null, creditorName: String(creditor).trim(), totalAmount: orig, paidAmount: paid, remainingAmount: rem, landArea, notes: String(getValP(row, rowColMap, "notes", ["keterangan"]) ?? "") };
        }).filter(Boolean);
      } else if (fileType === "piutang") {
        records = allRows.map(row => {
          const rowColMap = row._colMap as Record<string, string | null>;
          const debtor = getValP(row, rowColMap, "debtorName", ["debitur", "customer", "pelanggan"]);
          if (!debtor || SUMMARY_RE.test(String(debtor).trim())) return null;
          const totalAmount = parseFinanceNumber(getValP(row, rowColMap, "totalAmount", ["jumlah", "piutang", "tagihan", "nilai", "total"]));
          if (totalAmount === 0 && !debtor) return null;
          return {
            debtorName: String(debtor).trim(),
            category: String(getValP(row, rowColMap, "category", ["kategori"]) ?? "customer").trim() || "customer",
            totalAmount,
            dueDate: getValP(row, rowColMap, "dueDate", ["jatuh", "tempo", "due"]) ?? "",
            notes: String(getValP(row, rowColMap, "notes", ["keterangan", "catatan", "note"]) ?? ""),
          };
        }).filter(Boolean);
      } else if (["cashflow", "general_ledger", "bank"].includes(fileType)) {
        records = allRows.map(row => {
          const rowColMap = row._colMap as Record<string, string | null>;
          const amount = parseFinanceNumber(getValP(row, rowColMap, "amount", ["jumlah", "nominal", "amount", "nilai", "debit", "kredit"]));
          const transactionDate = getValP(row, rowColMap, "transactionDate", ["tanggal", "tgl", "date"]) ?? "";
          const description = getValP(row, rowColMap, "description", ["keterangan", "uraian", "deskripsi", "description"]);
          if (!transactionDate && amount === 0 && !description) return null;
          return {
            transactionDate,
            type: inferCashflowType(getValP(row, rowColMap, "type", ["jenis", "tipe", "debit", "kredit"]), amount),
            category: String(getValP(row, rowColMap, "category", ["kategori"]) ?? (fileType === "bank" ? "bank" : "lainnya")),
            projectName: String(getValP(row, rowColMap, "projectName", ["proyek", "project"]) ?? ""),
            amount: Math.abs(amount),
            description: String(description ?? ""),
            referenceNumber: String(getValP(row, rowColMap, "referenceNumber", ["nomor", "no", "ref", "reference"]) ?? ""),
          };
        }).filter(Boolean);
      } else if (fileType === "rab") {
        records = allRows.map(row => {
          const rowColMap = row._colMap as Record<string, string | null>;
          const itemName = getValP(row, rowColMap, "itemName", ["item", "pekerjaan", "uraian", "nama"]);
          if (!itemName || SUMMARY_RE.test(String(itemName).trim())) return null;
          const rabAmount = parseFinanceNumber(getValP(row, rowColMap, "rabAmount", ["anggaran", "rab", "rencana", "nilai"]));
          const realizationAmount = parseFinanceNumber(getValP(row, rowColMap, "realizationAmount", ["realisasi", "aktual", "terbayar"]));
          if (rabAmount === 0 && realizationAmount === 0 && !itemName) return null;
          return {
            projectName: String(getValP(row, rowColMap, "projectName", ["proyek", "project"]) ?? ""),
            stageCode: String(getValP(row, rowColMap, "stageCode", ["tahap", "kode", "stage"]) ?? ""),
            itemName: String(itemName).trim(),
            itemCategory: String(getValP(row, rowColMap, "itemCategory", ["kategori"]) ?? ""),
            rabAmount,
            realizationAmount,
          };
        }).filter(Boolean);
      }
    }

    let docTotal = 0;
    let paidTotal = 0;
    let remainingTotal = 0;
    let cashIn = 0;
    let cashOut = 0;
    if (fileType === "hutang") docTotal = records.reduce((s: number, r: any) => s + (Number(r.totalAmount) || 0), 0);
    else if (fileType === "piutang") docTotal = records.reduce((s: number, r: any) => s + (Number(r.totalAmount) || 0), 0);
    else if (["cashflow", "general_ledger", "bank"].includes(fileType)) {
      cashIn = records.filter((r: any) => r.type === "cash_in").reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
      cashOut = records.filter((r: any) => r.type === "cash_out").reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
      docTotal = cashIn - cashOut;
    }
    else if (fileType === "rab") docTotal = records.reduce((s: number, r: any) => s + (Number(r.rabAmount) || 0), 0);
    if (fileType === "hutang") {
      paidTotal = records.reduce((s: number, r: any) => s + (Number(r.paidAmount) || 0), 0);
      remainingTotal = records.reduce((s: number, r: any) => s + (Number(r.remainingAmount) || 0), 0);
    }

    const warnings: string[] = [];
    if (!records.length) warnings.push("AI tidak menemukan baris valid dari Excel. Cek header dan sheet yang diupload.");
    if (fileType === "hutang" && !colMap.creditorName) warnings.push("Kolom kreditur belum terdeteksi kuat. Periksa preview sebelum simpan.");
    if (fileType === "hutang" && !colMap.totalAmount) warnings.push("Kolom nilai hutang belum terdeteksi kuat. Pastikan total nominal sudah benar.");
    if (fileType === "hutang" && records.some((r: any) => ["bank", "kredit", "credit", "investment", "investasi", "kpp"].includes(String(r.category ?? "").toLowerCase()))) {
      warnings.push("Ada baris bank/kredit/investment. Pertimbangkan input ke menu Kredit & Investment agar bisa tersambung ke unit dan Akad Cair.");
    }
    if (["cashflow", "general_ledger", "bank"].includes(fileType) && !colMap.amount) warnings.push("Kolom nominal belum terdeteksi kuat. Periksa cash in/cash out sebelum simpan.");

    res.json({
      records,
      count: records.length,
      docTotal,
      paidTotal,
      remainingTotal,
      cashIn,
      cashOut,
      colMap,
      warnings,
      summary: `${records.length} baris valid dibaca dari ${sheets?.length ?? 0} sheet Excel.`,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── EDIT HUTANG ──────────────────────────────────────────────────────────────
router.put("/finance/hutang/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { creditorName, category, totalAmount, paidAmount, projectName, stageInfo, dueDate, notes, metadata } = req.body;
    const [before] = await db.select().from(debtRecordsTable).where(eq(debtRecordsTable.id, id));
    if (before?.lockedAt) return res.status(423).json({ error: "Record kredit sudah locked/lunas. Buat transaksi koreksi untuk revisi." });
    const orig = Number(totalAmount ?? 0); const paid = Number(paidAmount ?? 0);
    const remaining = Math.max(0, orig - paid);
    const [row] = await db.update(debtRecordsTable)
      .set({ creditorName, category: category || "supplier", totalAmount: String(orig), paidAmount: String(paid), remainingAmount: String(remaining), projectName: projectName || null, stageInfo: stageInfo || null, dueDate: dueDate || null, notes: notes || "", metadata: metadata ?? {}, status: remaining <= 0 ? "paid" : "outstanding", lockedAt: remaining <= 0 ? new Date() : null, lockedBy: remaining <= 0 ? "finance" : null })
      .where(eq(debtRecordsTable.id, id)).returning();
    await writeAudit("finance", "debt", id, "update", before ?? null, row, "finance", notes);
    res.json(row);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
