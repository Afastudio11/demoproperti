import { Router, type IRouter } from "express";
import {
  db,
  customersTable,
  customerDocumentsTable,
  customerStatusHistoryTable,
  customerComplaintsTable,
  handoversTable,
  sp3kRecordsTable,
  bankSubmissionsTable,
  akadRecordsTable,
  htRecordsTable,
  otsRecordsTable,
  akadDisbursementsTable,
  financeAkadDisbursementLedgerTable,
  unitsTable,
  planningSiteplanShapesTable
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateCustomerBody, UpdateCustomerBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/customers", async (req, res) => {
  try {
    let customers = await db.select().from(customersTable);
    if (req.query.projectId) {
      const pid = parseInt(req.query.projectId as string);
      customers = customers.filter(c => c.projectId === pid);
    }
    if (req.query.kprStatus) {
      customers = customers.filter(c => c.statusKpr === req.query.kprStatus);
    }
    res.json(customers.map(c => ({
      ...c,
      projectId: c.projectId ?? null,
      unitId: c.unitId ?? null,
      pekerjaan: c.pekerjaan ?? null,
      bank: c.bank ?? null,
      catatan: c.catatan ?? null,
      createdAt: c.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list customers");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/customers", async (req, res) => {
  try {
    const body = CreateCustomerBody.parse(req.body);
    const [customer] = await db.insert(customersTable).values(body).returning();
    res.status(201).json({ ...customer, projectId: customer.projectId ?? null, unitId: customer.unitId ?? null, pekerjaan: customer.pekerjaan ?? null, bank: customer.bank ?? null, catatan: customer.catatan ?? null, createdAt: customer.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create customer");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.get("/customers/kpr-pipeline", async (req, res) => {
  try {
    let customers = await db.select().from(customersTable);
    if (req.query.projectId) {
      const pid = parseInt(req.query.projectId as string);
      customers = customers.filter(c => c.projectId === pid);
    }
    const total = customers.length;
    const byStatus: Record<string, number> = {};
    customers.forEach(c => { byStatus[c.statusKpr] = (byStatus[c.statusKpr] || 0) + 1; });
    const rejected = customers.filter(c => c.statusKpr === "ditolak").length;
    res.json({
      total,
      byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      rejectRate: total > 0 ? Math.round((rejected / total) * 1000) / 10 : 0,
      avgDuration: 21,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get KPR pipeline");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/customers/:id", async (req, res) => {
  try {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, parseInt(req.params.id)));
    if (!customer) return res.status(404).json({ error: "Not found" });
    res.json({ ...customer, projectId: customer.projectId ?? null, unitId: customer.unitId ?? null, pekerjaan: customer.pekerjaan ?? null, bank: customer.bank ?? null, catatan: customer.catatan ?? null, createdAt: customer.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to get customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/customers/:id", async (req, res) => {
  try {
    const body = UpdateCustomerBody.parse(req.body);
    const [customer] = await db.update(customersTable).set(body).where(eq(customersTable.id, parseInt(req.params.id))).returning();
    if (!customer) return res.status(404).json({ error: "Not found" });
    res.json({ ...customer, projectId: customer.projectId ?? null, unitId: customer.unitId ?? null, pekerjaan: customer.pekerjaan ?? null, bank: customer.bank ?? null, catatan: customer.catatan ?? null, createdAt: customer.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update customer");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.delete("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "ID tidak valid" });

    // 1. Delete associated records from child tables
    await db.delete(customerDocumentsTable).where(eq(customerDocumentsTable.customerId, id));
    await db.delete(customerStatusHistoryTable).where(eq(customerStatusHistoryTable.customerId, id));
    await db.delete(customerComplaintsTable).where(eq(customerComplaintsTable.customerId, id));
    await db.delete(handoversTable).where(eq(handoversTable.customerId, id));
    await db.delete(sp3kRecordsTable).where(eq(sp3kRecordsTable.customerId, id));
    await db.delete(bankSubmissionsTable).where(eq(bankSubmissionsTable.customerId, id));
    await db.delete(akadRecordsTable).where(eq(akadRecordsTable.customerId, id));
    await db.delete(htRecordsTable).where(eq(htRecordsTable.customerId, id));
    await db.delete(otsRecordsTable).where(eq(otsRecordsTable.customerId, id));
    await db.delete(akadDisbursementsTable).where(eq(akadDisbursementsTable.customerId, id));
    await db.delete(financeAkadDisbursementLedgerTable).where(eq(financeAkadDisbursementLedgerTable.customerId, id));

    // 2. Dissociate customer references from other tables by setting customerId to null
    await db.update(unitsTable).set({ customerId: null }).where(eq(unitsTable.customerId, id));
    await db.update(planningSiteplanShapesTable).set({ customerId: null }).where(eq(planningSiteplanShapesTable.customerId, id));

    // 3. Delete the customer record itself
    const result = await db.delete(customersTable).where(eq(customersTable.id, id)).returning();
    if (result.length === 0) return res.status(404).json({ error: "Customer tidak ditemukan" });
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
