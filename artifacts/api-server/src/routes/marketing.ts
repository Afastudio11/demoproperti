import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  leadsTable,
  campaignsTable,
  brandingKpiTable,
  competitorsTable,
  marketingAbsorptionTable,
  projectsTable,
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const LEAD_STATUSES = [
  "NEW_LEAD", "CONTACTED", "INTERESTED",
  "SURVEY_DIJADWALKAN", "SURVEY_DILAKUKAN",
  "BOOKING", "BERKAS_LENGKAP", "DISERAHKAN_ADMIN",
  "BATAL", "PENDING",
];

function fmtLead(l: typeof leadsTable.$inferSelect) {
  const createdAt = l.createdAt instanceof Date ? l.createdAt : new Date(l.createdAt);
  const agingDays = Math.floor((Date.now() - createdAt.getTime()) / 86400000);
  let flag: string | null = null;
  if (agingDays > 7 && !["BOOKING","BERKAS_LENGKAP","DISERAHKAN_ADMIN","BATAL"].includes(l.status)) flag = "stagnan";
  return {
    ...l,
    agingDays,
    flag,
    createdAt: createdAt.toISOString(),
    updatedAt: l.updatedAt instanceof Date ? l.updatedAt.toISOString() : l.updatedAt,
  };
}

router.get("/marketing/leads", async (req, res) => {
  try {
    let leads = await db.select().from(leadsTable).orderBy(desc(leadsTable.createdAt));
    if (req.query.projectId) leads = leads.filter(l => l.projectId === parseInt(req.query.projectId as string));
    if (req.query.status) leads = leads.filter(l => l.status === req.query.status);
    if (req.query.source) leads = leads.filter(l => l.source === req.query.source);
    if (req.query.picSales) leads = leads.filter(l => (l.picSales ?? l.assignedTo) === req.query.picSales);
    if (req.query.search) {
      const q = (req.query.search as string).toLowerCase();
      leads = leads.filter(l => l.nama.toLowerCase().includes(q) || l.kontak.toLowerCase().includes(q));
    }
    res.json(leads.map(fmtLead));
  } catch (err) {
    req.log.error({ err }, "Failed to list marketing leads");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/marketing/leads/:id", async (req, res) => {
  try {
    const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, parseInt(req.params.id)));
    if (!lead) return res.status(404).json({ error: "Not found" });
    res.json(fmtLead(lead));
  } catch (err) {
    req.log.error({ err }, "Failed to get lead");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/marketing/leads", async (req, res) => {
  try {
    const body = req.body;
    if (!body.nama || !body.kontak || !body.projectId) return res.status(400).json({ error: "Nama, kontak, dan proyek wajib diisi" });
    const [lead] = await db.insert(leadsTable).values({ ...body, status: body.status || "NEW_LEAD" }).returning();
    res.status(201).json(fmtLead(lead));
  } catch (err) {
    req.log.error({ err }, "Failed to create lead");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.patch("/marketing/leads/:id", async (req, res) => {
  try {
    const body = req.body;
    const [lead] = await db.update(leadsTable).set({ ...body, updatedAt: new Date() }).where(eq(leadsTable.id, parseInt(req.params.id))).returning();
    if (!lead) return res.status(404).json({ error: "Not found" });
    res.json(fmtLead(lead));
  } catch (err) {
    req.log.error({ err }, "Failed to update lead");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.delete("/marketing/leads/:id", async (req, res) => {
  try {
    await db.delete(leadsTable).where(eq(leadsTable.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete lead");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/marketing/dashboard", async (req, res) => {
  try {
    const leads = await db.select().from(leadsTable);
    const projects = await db.select().from(projectsTable);
    const campaigns = await db.select().from(campaignsTable);
    const absorptions = await db.select().from(marketingAbsorptionTable);
    const brandingKpis = await db.select().from(brandingKpiTable);

    const now = Date.now();
    const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
    const monthLeads = leads.filter(l => new Date(l.createdAt) >= thisMonth);

    const totalLeads = monthLeads.length;
    const surveyCount = leads.filter(l => ["SURVEY_DIJADWALKAN","SURVEY_DILAKUKAN"].includes(l.status)).length;
    const bookingCount = leads.filter(l => l.status === "BOOKING").length;
    const berkasCount = leads.filter(l => ["BERKAS_LENGKAP","DISERAHKAN_ADMIN"].includes(l.status)).length;
    const totalCampaignSpend = campaigns.reduce((s, c) => s + parseFloat((c.spend ?? "0").toString()), 0);
    const cpl = totalLeads > 0 ? Math.round(totalCampaignSpend / Math.max(totalLeads, 1)) : 0;
    const totalUnits = absorptions.reduce((s, a) => s + (a.totalUnit || 0), 0);
    const totalTerjual = absorptions.reduce((s, a) => s + (a.unitTerjual || 0), 0);
    const absorptionRate = totalUnits > 0 ? Math.round((totalTerjual / totalUnits) * 100) : 0;
    const stockSisa = totalUnits - totalTerjual;

    const surveyed = leads.filter(l => ["SURVEY_DIJADWALKAN","SURVEY_DILAKUKAN","BOOKING","BERKAS_LENGKAP","DISERAHKAN_ADMIN"].includes(l.status)).length;
    const surveyRate = totalLeads > 0 ? Math.round((surveyed / Math.max(monthLeads.length, 1)) * 100) : 0;
    const bookingRate = surveyed > 0 ? Math.round((bookingCount / Math.max(surveyed, 1)) * 100) : 0;
    const berkasRate = bookingCount > 0 ? Math.round((berkasCount / Math.max(bookingCount, 1)) * 100) : 0;

    const avgBookingPerMonth = Math.max(bookingCount, 1);
    const coverageMonths = stockSisa > 0 ? Math.round(stockSisa / avgBookingPerMonth) : 0;

    const latestBranding = brandingKpis.sort((a, b) => b.bulan.localeCompare(a.bulan))[0];
    const brandingScore = latestBranding?.brandingScore ? parseFloat(latestBranding.brandingScore.toString()) : 0;

    const forecastNextMonth = Math.round(avgBookingPerMonth * 1.05);

    const healthComponents = [
      brandingScore * 0.20,
      Math.min(totalLeads / 20, 1) * 100 * 0.20,
      Math.max(0, 100 - cpl / 250) * 0.15,
      surveyRate * 0.15,
      bookingRate * 0.20,
      berkasRate * 0.10,
    ];
    const healthScore = Math.round(healthComponents.reduce((s, v) => s + v, 0));

    const demandScore = Math.round((surveyRate * 0.2 + bookingRate * 0.2 + absorptionRate * 0.2 + Math.min(totalLeads * 2, 100) * 0.2 + berkasRate * 0.2));

    const stagnanLeads = leads.filter(l => {
      const age = Math.floor((now - new Date(l.createdAt).getTime()) / 86400000);
      return age > 7 && !["BOOKING","BERKAS_LENGKAP","DISERAHKAN_ADMIN","BATAL"].includes(l.status);
    });

    const uncontacted = leads.filter(l => {
      const mins = Math.floor((now - new Date(l.createdAt).getTime()) / 60000);
      return l.status === "NEW_LEAD" && mins > 10;
    });

    const salesMap: Record<string, { nama: string; leads: number; survey: number; booking: number; berkas: number }> = {};
    leads.forEach(l => {
      const pic = l.picSales || l.assignedTo || "Belum Ditugaskan";
      if (!salesMap[pic]) salesMap[pic] = { nama: pic, leads: 0, survey: 0, booking: 0, berkas: 0 };
      salesMap[pic].leads++;
      if (["SURVEY_DIJADWALKAN","SURVEY_DILAKUKAN","BOOKING","BERKAS_LENGKAP","DISERAHKAN_ADMIN"].includes(l.status)) salesMap[pic].survey++;
      if (l.status === "BOOKING") salesMap[pic].booking++;
      if (["BERKAS_LENGKAP","DISERAHKAN_ADMIN"].includes(l.status)) salesMap[pic].berkas++;
    });

    const funnel = LEAD_STATUSES.slice(0, 7).map(s => ({
      status: s,
      count: leads.filter(l => l.status === s).length,
    }));

    const topSales = Object.values(salesMap)
      .map(s => ({
        ...s,
        surveyRate: s.leads > 0 ? Math.round(s.survey / s.leads * 100) : 0,
        bookingRate: s.survey > 0 ? Math.round(s.booking / s.survey * 100) : 0,
        berkasRate: s.booking > 0 ? Math.round(s.berkas / s.booking * 100) : 0,
        productivity: Math.round((s.survey / Math.max(s.leads, 1) * 100 * 0.33) + (s.booking / Math.max(s.survey, 1) * 100 * 0.33) + (s.berkas / Math.max(s.booking, 1) * 100 * 0.34)),
      }))
      .sort((a, b) => b.booking - a.booking)
      .slice(0, 5);

    const absorptionSummary = absorptions.map(a => {
      const project = projects.find(p => p.id === a.projectId);
      const rate = a.totalUnit > 0 ? Math.round((a.unitTerjual / a.totalUnit) * 100) : 0;
      return {
        ...a,
        projectName: project?.nama ?? "-",
        absorptionRate: rate,
        sisa: a.totalUnit - a.unitTerjual,
        coverageMonths: Math.round((a.totalUnit - a.unitTerjual) / Math.max(avgBookingPerMonth, 1)),
      };
    });

    res.json({
      brandingScore,
      totalLeads,
      cpl,
      surveyCount,
      bookingCount,
      berkasCount,
      absorptionRate,
      demandScore,
      coverageMonths,
      forecastNextMonth,
      healthScore,
      funnel,
      topSales,
      absorptionSummary,
      alerts: {
        uncontacted: uncontacted.length,
        stagnan: stagnanLeads.length,
        lowCoverage: coverageMonths < 3,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get marketing dashboard");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/marketing/campaigns", async (req, res) => {
  try {
    let rows = await db.select().from(campaignsTable).orderBy(desc(campaignsTable.createdAt));
    if (req.query.projectId) rows = rows.filter(r => r.projectId === parseInt(req.query.projectId as string));
    const result = rows.map(c => {
      const anggaran = parseFloat((c.anggaran ?? "0").toString());
      const spend = parseFloat((c.spend ?? "0").toString());
      const impresi = c.impresi ?? 0;
      const klik = c.klik ?? 0;
      const leadsGen = c.leadsGenerated ?? 0;
      return {
        ...c,
        anggaran: anggaran, spend: spend,
        cpl: leadsGen > 0 ? Math.round(spend / leadsGen) : 0,
        ctr: impresi > 0 ? Math.round(klik / impresi * 10000) / 100 : 0,
        cpm: impresi > 0 ? Math.round(spend / impresi * 1000) : 0,
      };
    });
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list campaigns");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/marketing/campaigns", async (req, res) => {
  try {
    const [row] = await db.insert(campaignsTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to create campaign");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.patch("/marketing/campaigns/:id", async (req, res) => {
  try {
    const [row] = await db.update(campaignsTable).set({ ...req.body, updatedAt: new Date() }).where(eq(campaignsTable.id, parseInt(req.params.id))).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to update campaign");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.delete("/marketing/campaigns/:id", async (req, res) => {
  try {
    await db.delete(campaignsTable).where(eq(campaignsTable.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete campaign");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/marketing/branding-kpi", async (req, res) => {
  try {
    const rows = await db.select().from(brandingKpiTable).orderBy(desc(brandingKpiTable.bulan));
    res.json(rows.map(r => ({ ...r, brandingScore: r.brandingScore ? parseFloat(r.brandingScore.toString()) : null })));
  } catch (err) {
    req.log.error({ err }, "Failed to list branding KPI");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/marketing/branding-kpi", async (req, res) => {
  try {
    const body = req.body;
    const followers = body.followers ?? 0;
    const reach = body.reach ?? 0;
    const impresi = body.impresi ?? 0;
    const engagement = body.engagement ?? 0;
    const targetFollowers = body.targetFollowers ?? 1;
    const targetReach = body.targetReach ?? 1;
    const targetEngagement = body.targetEngagement ?? 1;
    const engRate = impresi > 0 ? engagement / impresi : 0;
    const brandingScore = Math.min(100, Math.round(
      (Math.min(followers / targetFollowers, 1) * 25) +
      (Math.min(reach / targetReach, 1) * 25) +
      (Math.min(engagement / targetEngagement, 1) * 25) +
      (Math.min(engRate / 0.05, 1) * 25)
    ));
    const existing = await db.select().from(brandingKpiTable).where(
      and(eq(brandingKpiTable.bulan, body.bulan), eq(brandingKpiTable.platform, body.platform))
    );
    let row;
    if (existing.length > 0) {
      [row] = await db.update(brandingKpiTable).set({ ...body, brandingScore: brandingScore.toString(), updatedAt: new Date() }).where(eq(brandingKpiTable.id, existing[0].id)).returning();
    } else {
      [row] = await db.insert(brandingKpiTable).values({ ...body, brandingScore: brandingScore.toString() }).returning();
    }
    res.status(201).json({ ...row, brandingScore });
  } catch (err) {
    req.log.error({ err }, "Failed to upsert branding KPI");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.get("/marketing/competitors", async (req, res) => {
  try {
    let rows = await db.select().from(competitorsTable).orderBy(desc(competitorsTable.createdAt));
    if (req.query.projectId) rows = rows.filter(r => r.projectId === parseInt(req.query.projectId as string));
    res.json(rows.map(r => ({
      ...r,
      hargaMin: r.hargaMin ? parseFloat(r.hargaMin.toString()) : null,
      hargaMax: r.hargaMax ? parseFloat(r.hargaMax.toString()) : null,
      jarak: r.jarak ? parseFloat(r.jarak.toString()) : null,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list competitors");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/marketing/competitors", async (req, res) => {
  try {
    const [row] = await db.insert(competitorsTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to create competitor");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.patch("/marketing/competitors/:id", async (req, res) => {
  try {
    const [row] = await db.update(competitorsTable).set({ ...req.body, updatedAt: new Date() }).where(eq(competitorsTable.id, parseInt(req.params.id))).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to update competitor");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.delete("/marketing/competitors/:id", async (req, res) => {
  try {
    await db.delete(competitorsTable).where(eq(competitorsTable.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete competitor");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/marketing/absorption", async (req, res) => {
  try {
    let rows = await db.select().from(marketingAbsorptionTable).orderBy(desc(marketingAbsorptionTable.createdAt));
    const projects = await db.select().from(projectsTable);
    const leads = await db.select().from(leadsTable);
    const monthlyBookings = leads.filter(l => l.status === "BOOKING").length;
    const avgMonthly = Math.max(monthlyBookings / 3, 1);
    res.json(rows.map(r => {
      const project = projects.find(p => p.id === r.projectId);
      const rate = r.totalUnit > 0 ? Math.round((r.unitTerjual / r.totalUnit) * 100) : 0;
      return {
        ...r,
        projectName: project?.nama ?? "-",
        absorptionRate: rate,
        sisa: r.totalUnit - r.unitTerjual,
        coverageMonths: Math.round((r.totalUnit - r.unitTerjual) / avgMonthly),
      };
    }));
  } catch (err) {
    req.log.error({ err }, "Failed to list absorption");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/marketing/absorption", async (req, res) => {
  try {
    const [row] = await db.insert(marketingAbsorptionTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to create absorption");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.patch("/marketing/absorption/:id", async (req, res) => {
  try {
    const [row] = await db.update(marketingAbsorptionTable).set({ ...req.body, updatedAt: new Date() }).where(eq(marketingAbsorptionTable.id, parseInt(req.params.id))).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to update absorption");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.delete("/marketing/absorption/:id", async (req, res) => {
  try {
    await db.delete(marketingAbsorptionTable).where(eq(marketingAbsorptionTable.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete absorption");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/marketing/sales-performance", async (req, res) => {
  try {
    const leads = await db.select().from(leadsTable);
    const salesMap: Record<string, { nama: string; leads: number; survey: number; booking: number; berkas: number }> = {};
    leads.forEach(l => {
      const pic = l.picSales || l.assignedTo || "Belum Ditugaskan";
      if (!salesMap[pic]) salesMap[pic] = { nama: pic, leads: 0, survey: 0, booking: 0, berkas: 0 };
      salesMap[pic].leads++;
      if (["SURVEY_DIJADWALKAN","SURVEY_DILAKUKAN","BOOKING","BERKAS_LENGKAP","DISERAHKAN_ADMIN"].includes(l.status)) salesMap[pic].survey++;
      if (l.status === "BOOKING") salesMap[pic].booking++;
      if (["BERKAS_LENGKAP","DISERAHKAN_ADMIN"].includes(l.status)) salesMap[pic].berkas++;
    });
    const result = Object.values(salesMap).map(s => ({
      ...s,
      surveyRate: s.leads > 0 ? Math.round(s.survey / s.leads * 100) : 0,
      bookingRate: s.survey > 0 ? Math.round(s.booking / s.survey * 100) : 0,
      berkasRate: s.booking > 0 ? Math.round(s.berkas / s.booking * 100) : 0,
      productivity: Math.round(
        (s.survey / Math.max(s.leads, 1) * 100 * 0.33) +
        (s.booking / Math.max(s.survey, 1) * 100 * 0.33) +
        (s.berkas / Math.max(s.booking, 1) * 100 * 0.34)
      ),
    })).sort((a, b) => b.booking - a.booking);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get sales performance");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
