import { Router } from "express";
import { db } from "@workspace/db";
import {
  financeUploadsTable,
  cashflowRecordsTable,
  rabItemsTable,
  kppFacilitiesTable,
  kppPaymentsTable,
  debtRecordsTable,
  receivableRecordsTable,
  auditFindingsTable,
  financeAlertsTable,
  expansionAnalysesTable,
} from "@workspace/db";
import { eq, desc, sql, and, lte, gte, lt } from "drizzle-orm";
import { createDeepSeekClient, DEEPSEEK_MODEL, SATARA_SYSTEM_PROMPT } from "../lib/deepseek";

const router = Router();

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
router.get("/finance/dashboard", async (req, res) => {
  try {
    const today = new Date();
    const thisMonth = today.getMonth() + 1;
    const thisYear = today.getFullYear();
    const next30 = new Date(today); next30.setDate(today.getDate() + 30);

    const [cashflowIn, cashflowOut, debts, receivables, kpps, payments, alerts] = await Promise.all([
      db.select({ total: sql<number>`coalesce(sum(amount::numeric),0)` })
        .from(cashflowRecordsTable)
        .where(and(eq(cashflowRecordsTable.type, "cash_in"),
          sql`EXTRACT(MONTH FROM transaction_date) = ${thisMonth}`,
          sql`EXTRACT(YEAR FROM transaction_date) = ${thisYear}`)),
      db.select({ total: sql<number>`coalesce(sum(amount::numeric),0)` })
        .from(cashflowRecordsTable)
        .where(and(eq(cashflowRecordsTable.type, "cash_out"),
          sql`EXTRACT(MONTH FROM transaction_date) = ${thisMonth}`,
          sql`EXTRACT(YEAR FROM transaction_date) = ${thisYear}`)),
      db.select({ total: sql<number>`coalesce(sum(total_amount::numeric),0)` })
        .from(debtRecordsTable)
        .where(and(eq(debtRecordsTable.status, "outstanding"),
          sql`due_date <= ${next30.toISOString().split("T")[0]}`)),
      db.select({ total: sql<number>`coalesce(sum(total_amount::numeric),0)` })
        .from(receivableRecordsTable)
        .where(and(eq(receivableRecordsTable.status, "current"),
          sql`due_date <= ${next30.toISOString().split("T")[0]}`)),
      db.select().from(kppFacilitiesTable).where(eq(kppFacilitiesTable.isActive, true)),
      db.select({ kppId: kppPaymentsTable.kppId, total: sql<number>`coalesce(sum(principal_paid::numeric),0)` })
        .from(kppPaymentsTable)
        .groupBy(kppPaymentsTable.kppId),
      db.select().from(financeAlertsTable).where(eq(financeAlertsTable.isRead, false)).orderBy(desc(financeAlertsTable.createdAt)).limit(10),
    ]);

    const cashIn = Number(cashflowIn[0]?.total ?? 0);
    const cashOut = Number(cashflowOut[0]?.total ?? 0);
    const netCashflow = cashIn - cashOut;

    const payMap: Record<number, number> = {};
    for (const p of payments) { payMap[p.kppId] = Number(p.total); }

    let totalKpp = 0;
    for (const k of kpps) {
      const paid = payMap[k.id] ?? 0;
      totalKpp += Number(k.plafon) - paid;
    }

    const score = Math.min(100, Math.max(0, Math.round(
      (netCashflow > 0 ? 25 : 10) +
      (totalKpp < 5_000_000_000 ? 20 : 10) +
      (cashIn > cashOut * 1.2 ? 25 : 15) +
      20
    )));

    res.json({
      cashIn, cashOut, netCashflow,
      outstandingKpp: totalKpp,
      hutangJatuhTempo: Number(debts[0]?.total ?? 0),
      piutangJatuhTempo: Number(receivables[0]?.total ?? 0),
      financeScore: score,
      financeStatus: score >= 80 ? "SEHAT" : score >= 60 ? "WASPADA" : "KRITIS",
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

// Bulk import cashflow records
router.post("/finance/uploads/cashflow", async (req, res) => {
  try {
    const { uploadId, records } = req.body as { uploadId: number; records: any[] };
    if (!records?.length) { res.json({ inserted: 0 }); return; }
    const rows = records.map((r: any) => ({
      uploadId, transactionDate: r.transactionDate, type: r.type,
      category: r.category, projectName: r.projectName, amount: String(r.amount),
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
    const { fileType, fileName, headers, rows } = req.body as {
      fileType: string;
      fileName: string;
      headers: string[];
      rows: Record<string, any>[];
    };

    if (!rows?.length) {
      res.status(400).json({ error: "Tidak ada data untuk diimport" });
      return;
    }

    const SCHEMAS: Record<string, string> = {
      hutang: `Array of objects with fields:
- creditorName: string (nama kreditur/bank/vendor)
- category: "kpp" | "vendor" | "supplier" | "internal" (pilih yang paling cocok)
- totalAmount: number (angka Rupiah, hilangkan "Rp", titik/koma pemisah ribuan)
- dueDate: string format "YYYY-MM-DD" (tanggal jatuh tempo)
- status: "outstanding" | "paid" | "overdue" (default "outstanding" jika tidak ada info)
- notes: string (catatan, boleh kosong "")`,

      piutang: `Array of objects with fields:
- debtorName: string (nama debitur/pelanggan)
- category: "customer" | "internal" | "vendor"
- totalAmount: number (angka Rupiah)
- dueDate: string format "YYYY-MM-DD"
- status: "current" | "overdue" | "paid" (default "current")
- notes: string`,

      cashflow: `Array of objects with fields:
- transactionDate: string format "YYYY-MM-DD"
- type: "cash_in" | "cash_out"
- category: string (kategori transaksi)
- projectName: string (nama proyek, boleh kosong "")
- amount: number (nilai absolut, selalu positif)
- description: string (keterangan)
- referenceNumber: string (no. referensi, boleh kosong "")`,

      rab: `Array of objects with fields:
- projectName: string (nama proyek)
- stageCode: string (kode tahap: LAND, PLAN, LEGAL, SELL, BUILD, AKAD, HANDOVER)
- itemName: string (nama item pekerjaan)
- itemCategory: string (kategori item)
- rabAmount: number (anggaran dalam Rupiah)
- realizationAmount: number (realisasi dalam Rupiah, 0 jika belum ada)`,

      general_ledger: `Array of objects with fields:
- transactionDate: string format "YYYY-MM-DD"
- type: "cash_in" | "cash_out" (debit = cash_in, kredit = cash_out)
- category: string
- projectName: string
- amount: number
- description: string
- referenceNumber: string`,

      bank: `Array of objects with fields:
- transactionDate: string format "YYYY-MM-DD"
- type: "cash_in" | "cash_out" (kredit/masuk = cash_in, debit/keluar = cash_out)
- category: "bank"
- projectName: string
- amount: number (nilai absolut)
- description: string
- referenceNumber: string`,
    };

    const targetSchema = SCHEMAS[fileType] ?? SCHEMAS["cashflow"];
    const sampleRows = rows.slice(0, 20);

    const ai = createDeepSeekClient();
    const prompt = `Kamu adalah sistem ekstraksi data keuangan. Tugas kamu: baca data Excel berikut dan petakan ke skema target.

JENIS DATA: ${fileType}
NAMA FILE: ${fileName}
HEADER KOLOM: ${JSON.stringify(headers)}
CONTOH DATA (${sampleRows.length} baris pertama dari ${rows.length} total):
${JSON.stringify(sampleRows, null, 2)}

SKEMA TARGET:
${targetSchema}

INSTRUKSI PENTING:
1. Petakan SEMUA ${rows.length} baris data (bukan hanya sampel)
2. Bersihkan format angka Rupiah (hilangkan "Rp", titik, ganti koma dengan titik desimal)
3. Format tanggal ke "YYYY-MM-DD" — kenali format Indonesia (DD/MM/YYYY, DD-MM-YYYY, dll)
4. Jika kolom tidak ada, gunakan nilai default yang logis
5. Skip baris yang kosong atau hanya berisi header
6. Untuk category, gunakan inferensi konteks jika tidak eksplisit

DATA LENGKAP SEMUA BARIS:
${JSON.stringify(rows, null, 2)}

Kembalikan HANYA JSON array yang valid tanpa komentar atau penjelasan. Format: [{"field": "value", ...}, ...]`;

    const completion = await ai.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: "Kamu adalah sistem ekstraksi data. Selalu kembalikan JSON array yang valid." },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
    });

    let rawContent = completion.choices[0]?.message?.content ?? "[]";
    const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("AI tidak mengembalikan JSON array yang valid");
    const mapped: any[] = JSON.parse(jsonMatch[0]);

    const now = new Date();
    const [uploadLog] = await db.insert(financeUploadsTable).values({
      fileType,
      fileName,
      periodYear: now.getFullYear(),
      periodMonth: now.getMonth() + 1,
      rowCount: mapped.length,
      status: "berhasil",
    }).returning();

    const uploadId = uploadLog.id;
    let inserted = 0;

    if (fileType === "hutang") {
      const dbRows = mapped.map((r: any) => ({
        uploadId, creditorName: String(r.creditorName ?? ""), category: r.category ?? "vendor",
        totalAmount: String(Number(r.totalAmount) || 0), dueDate: r.dueDate || null,
        status: r.status ?? "outstanding", notes: r.notes ?? "",
      }));
      const result = await db.insert(debtRecordsTable).values(dbRows).returning();
      inserted = result.length;

    } else if (fileType === "piutang") {
      const dbRows = mapped.map((r: any) => ({
        uploadId, debtorName: String(r.debtorName ?? ""), category: r.category ?? "customer",
        totalAmount: String(Number(r.totalAmount) || 0), dueDate: r.dueDate || null,
        status: r.status ?? "current", notes: r.notes ?? "",
      }));
      const result = await db.insert(receivableRecordsTable).values(dbRows).returning();
      inserted = result.length;

    } else if (fileType === "cashflow" || fileType === "general_ledger" || fileType === "bank") {
      const dbRows = mapped.map((r: any) => ({
        uploadId, transactionDate: r.transactionDate, type: r.type ?? "cash_in",
        category: r.category ?? "lainnya", projectName: r.projectName ?? "",
        amount: String(Math.abs(Number(r.amount) || 0)),
        description: r.description ?? "", referenceNumber: r.referenceNumber ?? "",
      }));
      const result = await db.insert(cashflowRecordsTable).values(dbRows).returning();
      inserted = result.length;

    } else if (fileType === "rab") {
      const dbRows = mapped.map((r: any) => ({
        uploadId, projectName: r.projectName ?? "", stageCode: r.stageCode ?? "",
        itemName: r.itemName ?? "", itemCategory: r.itemCategory ?? "",
        rabAmount: String(Number(r.rabAmount) || 0),
        realizationAmount: String(Number(r.realizationAmount) || 0),
      }));
      const result = await db.insert(rabItemsTable).values(dbRows).returning();
      inserted = result.length;
    }

    res.json({ uploadId, inserted, mapped: mapped.slice(0, 5) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── CASHFLOW ─────────────────────────────────────────────────────────────────
router.get("/finance/cashflow", async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const monthly = await db.select({
      month: sql<number>`EXTRACT(MONTH FROM transaction_date)`,
      type: cashflowRecordsTable.type,
      category: cashflowRecordsTable.category,
      total: sql<number>`coalesce(sum(amount::numeric),0)`,
    })
      .from(cashflowRecordsTable)
      .where(sql`EXTRACT(YEAR FROM transaction_date) = ${Number(year)}`)
      .groupBy(sql`EXTRACT(MONTH FROM transaction_date)`, cashflowRecordsTable.type, cashflowRecordsTable.category)
      .orderBy(sql`EXTRACT(MONTH FROM transaction_date)`);

    const byMonth: Record<number, { cashIn: number; cashOut: number; categories: Record<string, number> }> = {};
    for (let m = 1; m <= 12; m++) byMonth[m] = { cashIn: 0, cashOut: 0, categories: {} };

    for (const row of monthly) {
      const m = Number(row.month);
      const amt = Number(row.total);
      if (row.type === "cash_in") byMonth[m].cashIn += amt;
      else byMonth[m].cashOut += amt;
      byMonth[m].categories[row.category] = (byMonth[m].categories[row.category] ?? 0) + amt;
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
    const [facilities, payments] = await Promise.all([
      db.select().from(kppFacilitiesTable).orderBy(desc(kppFacilitiesTable.createdAt)),
      db.select({
        kppId: kppPaymentsTable.kppId,
        totalPrincipal: sql<number>`coalesce(sum(principal_paid::numeric),0)`,
        totalInterest: sql<number>`coalesce(sum(interest_paid::numeric),0)`,
      }).from(kppPaymentsTable).groupBy(kppPaymentsTable.kppId),
    ]);

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
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── HUTANG CENTER ────────────────────────────────────────────────────────────
router.get("/finance/hutang", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const d30 = new Date(); d30.setDate(d30.getDate() + 30);
    const d60 = new Date(); d60.setDate(d60.getDate() + 60);

    const records = await db.select().from(debtRecordsTable).where(eq(debtRecordsTable.status, "outstanding")).orderBy(debtRecordsTable.dueDate);

    const byCategory: Record<string, { total: number; lt30: number; d30_60: number; gt60: number; items: any[] }> = {};
    let totalAll = 0;

    for (const r of records) {
      const amt = Number(r.totalAmount);
      const due = r.dueDate ? new Date(r.dueDate) : null;
      const cat = r.category;
      if (!byCategory[cat]) byCategory[cat] = { total: 0, lt30: 0, d30_60: 0, gt60: 0, items: [] };
      byCategory[cat].total += amt;
      totalAll += amt;
      if (due) {
        if (due <= d30) byCategory[cat].lt30 += amt;
        else if (due <= d60) byCategory[cat].d30_60 += amt;
        else byCategory[cat].gt60 += amt;
      }
      byCategory[cat].items.push(r);
    }

    res.json({ byCategory, total: totalAll, records });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/finance/hutang", async (req, res) => {
  try {
    const { creditorName, category, totalAmount, dueDate, notes } = req.body;
    const [row] = await db.insert(debtRecordsTable).values({ creditorName, category, totalAmount: String(totalAmount), dueDate, notes, status: "outstanding" }).returning();
    res.json(row);
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
    const items = await db.select().from(rabItemsTable).orderBy(rabItemsTable.projectName, rabItemsTable.stageCode);

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
    const cashflowData = await db.select({
      projectName: cashflowRecordsTable.projectName,
      type: cashflowRecordsTable.type,
      total: sql<number>`coalesce(sum(amount::numeric),0)`,
    }).from(cashflowRecordsTable).groupBy(cashflowRecordsTable.projectName, cashflowRecordsTable.type);

    const byProject: Record<string, { pendapatan: number; biaya: number }> = {};
    for (const row of cashflowData) {
      const p = row.projectName ?? "Tanpa Proyek";
      if (!byProject[p]) byProject[p] = { pendapatan: 0, biaya: 0 };
      if (row.type === "cash_in") byProject[p].pendapatan += Number(row.total);
      else byProject[p].biaya += Number(row.total);
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

    const [receivables, debts, kpps, payments] = await Promise.all([
      db.select().from(receivableRecordsTable).where(eq(receivableRecordsTable.status, "current")),
      db.select().from(debtRecordsTable).where(eq(debtRecordsTable.status, "outstanding")),
      db.select().from(kppFacilitiesTable).where(eq(kppFacilitiesTable.isActive, true)),
      db.select({ kppId: kppPaymentsTable.kppId, total: sql<number>`coalesce(sum(principal_paid::numeric),0)` })
        .from(kppPaymentsTable).groupBy(kppPaymentsTable.kppId),
    ]);

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
        .reduce((s, r) => s + Number(r.totalAmount), 0) + totalKppMonthly;

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
      db.select({ total: sql<number>`coalesce(sum(total_amount::numeric),0)` }).from(debtRecordsTable).where(eq(debtRecordsTable.status, "outstanding")),
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
      db.select({ total: sql<number>`coalesce(sum(total_amount::numeric),0)` }).from(debtRecordsTable).where(eq(debtRecordsTable.status, "outstanding")),
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

export default router;
