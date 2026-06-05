import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { subkonContractsTable, subkonPaymentsTable, paymentApprovalsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

// ─── SUBKON CONTRACTS ────────────────────────────────────────────────────────

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
    const contractValue = valuePerUnit * unitCount;
    const totalRetention = retentionPerUnit * unitCount;
    const netPayableValue = contractValue - totalRetention;

    const [row] = await db.insert(subkonContractsTable).values({
      projectId,
      stageCode: stageCode ?? null,
      subkonName,
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
    const [row] = await db.update(subkonContractsTable).set(req.body).where(eq(subkonContractsTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update subkon contract");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.delete("/produksi/subkon/contracts/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
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
    const { contractId, period, progressCurrent, notes } = req.body as {
      contractId: number;
      period: string;
      progressCurrent: number;
      notes?: string;
    };

    const [contract] = await db.select().from(subkonContractsTable).where(eq(subkonContractsTable.id, contractId));
    if (!contract) return res.status(404).json({ error: "Contract not found" });

    const prevPayments = await db.select().from(subkonPaymentsTable)
      .where(and(eq(subkonPaymentsTable.contractId, contractId), eq(subkonPaymentsTable.status, "paid")));
    const totalPaidBefore = prevPayments.reduce((sum, p) => sum + (p.netPayment ?? 0), 0);
    const progressPrevious = prevPayments.length > 0 ? Math.max(...prevPayments.map(p => p.progressCurrent)) : 0;
    const terminNumber = prevPayments.length + 1;

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

    if (status === "approved") {
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
    const [row] = await db.update(subkonPaymentsTable).set({ status: "paid", paymentDate: new Date().toISOString().split("T")[0] }).where(eq(subkonPaymentsTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to mark payment as paid");
    res.status(400).json({ error: "Invalid request" });
  }
});

export default router;
