import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { customersTable } from "@workspace/db";
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

export default router;
