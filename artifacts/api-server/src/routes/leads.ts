import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { leadsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateLeadBody, UpdateLeadBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/leads", async (req, res) => {
  try {
    let leads = await db.select().from(leadsTable);
    if (req.query.projectId) {
      const pid = parseInt(req.query.projectId as string);
      leads = leads.filter(l => l.projectId === pid);
    }
    if (req.query.status) {
      leads = leads.filter(l => l.status === req.query.status);
    }
    res.json(leads.map(l => ({
      ...l,
      assignedTo: l.assignedTo ?? null,
      campaign: l.campaign ?? null,
      followUpAt: l.followUpAt ?? null,
      alasanBatal: l.alasanBatal ?? null,
      createdAt: l.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list leads");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/leads", async (req, res) => {
  try {
    const body = CreateLeadBody.parse(req.body);
    const [lead] = await db.insert(leadsTable).values(body).returning();
    res.status(201).json({ ...lead, assignedTo: lead.assignedTo ?? null, campaign: lead.campaign ?? null, followUpAt: lead.followUpAt ?? null, alasanBatal: lead.alasanBatal ?? null, createdAt: lead.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create lead");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.patch("/leads/:id", async (req, res) => {
  try {
    const body = UpdateLeadBody.parse(req.body);
    const [lead] = await db.update(leadsTable).set(body).where(eq(leadsTable.id, parseInt(req.params.id))).returning();
    if (!lead) return res.status(404).json({ error: "Not found" });
    res.json({ ...lead, assignedTo: lead.assignedTo ?? null, campaign: lead.campaign ?? null, followUpAt: lead.followUpAt ?? null, alasanBatal: lead.alasanBatal ?? null, createdAt: lead.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update lead");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.get("/leads/marketing-kpi", async (req, res) => {
  try {
    let leads = await db.select().from(leadsTable);
    if (req.query.projectId) {
      const pid = parseInt(req.query.projectId as string);
      leads = leads.filter(l => l.projectId === pid);
    }
    const total = leads.length;
    const bookings = leads.filter(l => l.status === "booking").length;
    const akad = leads.filter(l => l.status === "akad").length;
    const surveys = leads.filter(l => l.status === "survey").length;

    const bySource: Record<string, number> = {};
    leads.forEach(l => { bySource[l.source] = (bySource[l.source] || 0) + 1; });

    res.json({
      totalLeads: total,
      cpl: 250000,
      conversionRate: total > 0 ? Math.round((bookings / total) * 1000) / 10 : 0,
      bookingToAkadRate: bookings > 0 ? Math.round((akad / bookings) * 1000) / 10 : 0,
      surveyRate: total > 0 ? Math.round((surveys / total) * 1000) / 10 : 0,
      responseTimeAvg: 4.2,
      bySource: Object.entries(bySource).map(([source, count]) => ({ source, count })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get marketing KPI");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
