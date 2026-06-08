import { Router } from "express";
import { db } from "@workspace/db";
import { desc, eq, and } from "drizzle-orm";
import {
  corporateBrandRecordsTable,
  founderBrandingRecordsTable,
  mediaExposuresTable,
  contentItemsTable,
  contentStatusHistoryTable,
  socialMediaKpiTable,
  contentPerformanceTable,
  projectBrandingScoresTable,
  prActivitiesTable,
  sentimentRecordsTable,
  contentRoiTable,
  trustScoreRecordsTable,
} from "@workspace/db/schema";

const router = Router();

// ─── DASHBOARD ─────────────────────────────────────────────────────────────
router.get("/branding/dashboard", async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const [socialKpis, contentItems, sentimentRows, trustRows, projectScores, founderRows] = await Promise.all([
      db.select().from(socialMediaKpiTable).where(and(eq(socialMediaKpiTable.periodYear, year), eq(socialMediaKpiTable.periodMonth, month))),
      db.select().from(contentItemsTable).orderBy(desc(contentItemsTable.createdAt)),
      db.select().from(sentimentRecordsTable).where(and(eq(sentimentRecordsTable.periodYear, year), eq(sentimentRecordsTable.periodMonth, month))),
      db.select().from(trustScoreRecordsTable).where(and(eq(trustScoreRecordsTable.periodYear, year), eq(trustScoreRecordsTable.periodMonth, month))),
      db.select().from(projectBrandingScoresTable).where(and(eq(projectBrandingScoresTable.periodYear, year), eq(projectBrandingScoresTable.periodMonth, month))),
      db.select().from(founderBrandingRecordsTable).where(and(eq(founderBrandingRecordsTable.periodYear, year), eq(founderBrandingRecordsTable.periodMonth, month))),
    ]);

    const totalReach = socialKpis.reduce((s, r) => s + (r.reach ?? 0), 0);
    const totalEngagement = socialKpis.reduce((s, r) => s + (r.engagement ?? 0), 0);
    const engagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;

    const totalSentiment = sentimentRows.reduce((s, r) => s + (r.totalAnalyzed ?? 0), 0);
    const totalPositive = sentimentRows.reduce((s, r) => s + (r.positiveCount ?? 0), 0);
    const sentimentScore = totalSentiment > 0 ? (totalPositive / totalSentiment) * 100 : 0;

    const latestTrust = trustRows[0];
    const trustScore = latestTrust ? parseFloat(latestTrust.trustScore?.toString() ?? "0") : 0;

    const pipeline = {
      idea: contentItems.filter(c => c.productionStatus === "idea").length,
      script: contentItems.filter(c => c.productionStatus === "script").length,
      shooting: contentItems.filter(c => c.productionStatus === "shooting").length,
      editing: contentItems.filter(c => c.productionStatus === "editing").length,
      review: contentItems.filter(c => c.productionStatus === "review").length,
      approved: contentItems.filter(c => c.productionStatus === "approved").length,
      posted: contentItems.filter(c => c.productionStatus === "posted").length,
    };
    const totalPipeline = pipeline.idea + pipeline.script + pipeline.shooting + pipeline.editing + pipeline.review + pipeline.approved;

    const founderTotalReach = founderRows.reduce((s, r) => s + (r.reach ?? 0), 0);
    const founderTotalLeads = founderRows.reduce((s, r) => s + (r.leadsFromFounder ?? 0), 0);
    const founderEngagement = founderRows.reduce((s, r) => s + (r.engagement ?? 0), 0);
    const founderEngRate = founderTotalReach > 0 ? (founderEngagement / founderTotalReach) * 100 : 0;
    const founderInfluenceScore = Math.min(100, Math.round(
      (Math.min(100, (founderTotalReach / 50000) * 100) * 0.25) +
      (Math.min(100, (founderEngRate / 5) * 100) * 0.25) +
      50 * 0.25 +
      50 * 0.25
    ));

    const reachScore = Math.min(100, (totalReach / 100000) * 100);
    const engScore = Math.min(100, (engagementRate / 5) * 100);
    const contentCompletion = Math.min(100, (pipeline.posted / 30) * 100);
    const sentimentComp = Math.min(100, (sentimentScore / 80) * 100);
    const organicLeadContrib = 30;
    const brandHealthScore = Math.round((reachScore + engScore + contentCompletion + sentimentComp + organicLeadContrib) / 5);

    res.json({
      brandHealthScore,
      totalReach,
      engagementRate: Math.round(engagementRate * 10) / 10,
      sentimentScore: Math.round(sentimentScore * 10) / 10,
      trustScore,
      founderInfluenceScore,
      pipeline,
      totalPipeline,
      projectScores: projectScores.map(p => ({
        ...p,
        totalScore: p.totalScore ? parseFloat(p.totalScore.toString()) : 0,
      })),
      healthComponents: { reachScore, engScore, contentCompletion, sentimentComp, organicLeadContrib },
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch branding dashboard");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── CORPORATE BRANDING ────────────────────────────────────────────────────
router.get("/branding/corporate", async (req, res) => {
  try {
    const rows = await db.select().from(corporateBrandRecordsTable).orderBy(desc(corporateBrandRecordsTable.createdAt));
    res.json(rows.map(r => ({ ...r, awarenessScore: r.awarenessScore ? parseFloat(r.awarenessScore.toString()) : null, consistencyScore: r.consistencyScore ? parseFloat(r.consistencyScore.toString()) : null })));
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/branding/corporate", async (req, res) => {
  try {
    const [row] = await db.insert(corporateBrandRecordsTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/branding/corporate/:id", async (req, res) => {
  try {
    const [row] = await db.update(corporateBrandRecordsTable).set(req.body).where(eq(corporateBrandRecordsTable.id, parseInt(req.params.id))).returning();
    res.json(row);
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/branding/corporate/:id", async (req, res) => {
  try {
    await db.delete(corporateBrandRecordsTable).where(eq(corporateBrandRecordsTable.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

// ─── FOUNDER BRANDING ──────────────────────────────────────────────────────
router.get("/branding/founder", async (req, res) => {
  try {
    const rows = await db.select().from(founderBrandingRecordsTable).orderBy(desc(founderBrandingRecordsTable.periodYear), desc(founderBrandingRecordsTable.periodMonth));
    res.json(rows);
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/branding/founder", async (req, res) => {
  try {
    const [row] = await db.insert(founderBrandingRecordsTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/branding/founder/:id", async (req, res) => {
  try {
    const [row] = await db.update(founderBrandingRecordsTable).set(req.body).where(eq(founderBrandingRecordsTable.id, parseInt(req.params.id))).returning();
    res.json(row);
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/branding/founder/:id", async (req, res) => {
  try {
    await db.delete(founderBrandingRecordsTable).where(eq(founderBrandingRecordsTable.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

// ─── MEDIA EXPOSURES ───────────────────────────────────────────────────────
router.get("/branding/media-exposure", async (req, res) => {
  try {
    const rows = await db.select().from(mediaExposuresTable).orderBy(desc(mediaExposuresTable.createdAt));
    res.json(rows);
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/branding/media-exposure", async (req, res) => {
  try {
    const [row] = await db.insert(mediaExposuresTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/branding/media-exposure/:id", async (req, res) => {
  try {
    await db.delete(mediaExposuresTable).where(eq(mediaExposuresTable.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

// ─── CONTENT ITEMS ─────────────────────────────────────────────────────────
router.get("/branding/content", async (req, res) => {
  try {
    const { status, month, year } = req.query as any;
    let query = db.select().from(contentItemsTable).$dynamic();
    const rows = await db.select().from(contentItemsTable).orderBy(desc(contentItemsTable.createdAt));
    let filtered = rows;
    if (status) filtered = filtered.filter(r => r.productionStatus === status);
    if (month && year) filtered = filtered.filter(r => {
      const d = r.scheduledPostDate;
      if (!d) return false;
      const dt = new Date(d);
      return dt.getFullYear() === parseInt(year) && dt.getMonth() + 1 === parseInt(month);
    });
    res.json(filtered);
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/branding/content/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(contentItemsTable).where(eq(contentItemsTable.id, parseInt(req.params.id)));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/branding/content", async (req, res) => {
  try {
    const [row] = await db.insert(contentItemsTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/branding/content/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await db.select().from(contentItemsTable).where(eq(contentItemsTable.id, id));
    if (existing.length && req.body.productionStatus && existing[0].productionStatus !== req.body.productionStatus) {
      await db.insert(contentStatusHistoryTable).values({
        contentId: id,
        fromStatus: existing[0].productionStatus,
        toStatus: req.body.productionStatus,
        changedBy: req.body.changedBy ?? "sistem",
      });
    }
    const [row] = await db.update(contentItemsTable).set(req.body).where(eq(contentItemsTable.id, id)).returning();
    res.json(row);
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/branding/content/:id", async (req, res) => {
  try {
    await db.delete(contentItemsTable).where(eq(contentItemsTable.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/branding/content/:id/history", async (req, res) => {
  try {
    const rows = await db.select().from(contentStatusHistoryTable).where(eq(contentStatusHistoryTable.contentId, parseInt(req.params.id))).orderBy(desc(contentStatusHistoryTable.createdAt));
    res.json(rows);
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

// ─── SOCIAL MEDIA KPI ──────────────────────────────────────────────────────
router.get("/branding/social-media", async (req, res) => {
  try {
    const rows = await db.select().from(socialMediaKpiTable).orderBy(desc(socialMediaKpiTable.periodYear), desc(socialMediaKpiTable.periodMonth));
    res.json(rows);
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/branding/social-media", async (req, res) => {
  try {
    const { periodYear, periodMonth, platform } = req.body;
    const existing = await db.select().from(socialMediaKpiTable).where(
      and(eq(socialMediaKpiTable.periodYear, periodYear), eq(socialMediaKpiTable.periodMonth, periodMonth), eq(socialMediaKpiTable.platform, platform))
    );
    let row;
    if (existing.length) {
      [row] = await db.update(socialMediaKpiTable).set(req.body).where(eq(socialMediaKpiTable.id, existing[0].id)).returning();
    } else {
      [row] = await db.insert(socialMediaKpiTable).values(req.body).returning();
    }
    res.status(201).json(row);
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/branding/social-media/:id", async (req, res) => {
  try {
    await db.delete(socialMediaKpiTable).where(eq(socialMediaKpiTable.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

// ─── CONTENT PERFORMANCE ───────────────────────────────────────────────────
router.get("/branding/content-performance", async (req, res) => {
  try {
    const rows = await db.select().from(contentPerformanceTable).orderBy(desc(contentPerformanceTable.createdAt));
    res.json(rows.map(r => ({ ...r, contentScore: r.contentScore ? parseFloat(r.contentScore.toString()) : null })));
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/branding/content-performance", async (req, res) => {
  try {
    const { reach = 0, engagement = 0, saves = 0, shares = 0 } = req.body;
    const engRate = reach > 0 ? (engagement / reach) * 100 : 0;
    const avgReachForScore = 20000;
    const reachComp = Math.min(100, (reach / avgReachForScore) * 100) * 0.4;
    const engComp = Math.min(100, (engRate / 5) * 100) * 0.4;
    const saveShareComp = Math.min(100, ((saves + shares) / 500) * 100) * 0.2;
    const contentScore = Math.round(reachComp + engComp + saveShareComp);
    const [row] = await db.insert(contentPerformanceTable).values({ ...req.body, contentScore: contentScore.toString() }).returning();
    res.status(201).json({ ...row, contentScore });
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/branding/content-performance/:id", async (req, res) => {
  try {
    await db.delete(contentPerformanceTable).where(eq(contentPerformanceTable.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

// ─── PROJECT BRANDING SCORES ───────────────────────────────────────────────
router.get("/branding/project-scores", async (req, res) => {
  try {
    const rows = await db.select().from(projectBrandingScoresTable).orderBy(desc(projectBrandingScoresTable.periodYear), desc(projectBrandingScoresTable.periodMonth));
    res.json(rows.map(r => ({ ...r, totalScore: r.totalScore ? parseFloat(r.totalScore.toString()) : null })));
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/branding/project-scores", async (req, res) => {
  try {
    const { awarenessScore = 0, engagementScore = 0, inquiryScore = 0, sentimentScore = 0 } = req.body;
    const totalScore = Math.round((parseFloat(awarenessScore) + parseFloat(engagementScore) + parseFloat(inquiryScore) + parseFloat(sentimentScore)) / 4);
    const [row] = await db.insert(projectBrandingScoresTable).values({ ...req.body, totalScore: totalScore.toString() }).returning();
    res.status(201).json({ ...row, totalScore });
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/branding/project-scores/:id", async (req, res) => {
  try {
    await db.delete(projectBrandingScoresTable).where(eq(projectBrandingScoresTable.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

// ─── PR ACTIVITIES ─────────────────────────────────────────────────────────
router.get("/branding/pr", async (req, res) => {
  try {
    const rows = await db.select().from(prActivitiesTable).orderBy(desc(prActivitiesTable.createdAt));
    res.json(rows.map(r => ({ ...r, cost: r.cost ? parseFloat(r.cost.toString()) : 0, prScore: r.prScore ? parseFloat(r.prScore.toString()) : null })));
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/branding/pr", async (req, res) => {
  try {
    const [row] = await db.insert(prActivitiesTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/branding/pr/:id", async (req, res) => {
  try {
    const [row] = await db.update(prActivitiesTable).set(req.body).where(eq(prActivitiesTable.id, parseInt(req.params.id))).returning();
    res.json(row);
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/branding/pr/:id", async (req, res) => {
  try {
    await db.delete(prActivitiesTable).where(eq(prActivitiesTable.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

// ─── SENTIMENT ─────────────────────────────────────────────────────────────
router.get("/branding/sentiment", async (req, res) => {
  try {
    const rows = await db.select().from(sentimentRecordsTable).orderBy(desc(sentimentRecordsTable.periodYear), desc(sentimentRecordsTable.periodMonth));
    res.json(rows);
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/branding/sentiment", async (req, res) => {
  try {
    const [row] = await db.insert(sentimentRecordsTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/branding/sentiment/:id", async (req, res) => {
  try {
    await db.delete(sentimentRecordsTable).where(eq(sentimentRecordsTable.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

// ─── CONTENT ROI ───────────────────────────────────────────────────────────
router.get("/branding/roi", async (req, res) => {
  try {
    const rows = await db.select().from(contentRoiTable).orderBy(desc(contentRoiTable.createdAt));
    const content = await db.select().from(contentItemsTable);
    const contentMap = Object.fromEntries(content.map(c => [c.id, c]));
    res.json(rows.map(r => ({
      ...r,
      estimatedAkadValue: r.estimatedAkadValue ? parseFloat(r.estimatedAkadValue.toString()) : 0,
      contentTitle: contentMap[r.contentId]?.title ?? `Konten #${r.contentId}`,
      productionCost: contentMap[r.contentId]?.productionCost ? parseFloat(contentMap[r.contentId].productionCost!.toString()) : 0,
    })));
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/branding/roi", async (req, res) => {
  try {
    const [row] = await db.insert(contentRoiTable).values(req.body).returning();
    res.status(201).json(row);
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/branding/roi/:id", async (req, res) => {
  try {
    await db.delete(contentRoiTable).where(eq(contentRoiTable.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

// ─── TRUST SCORE ───────────────────────────────────────────────────────────
router.get("/branding/trust", async (req, res) => {
  try {
    const rows = await db.select().from(trustScoreRecordsTable).orderBy(desc(trustScoreRecordsTable.periodYear), desc(trustScoreRecordsTable.periodMonth));
    res.json(rows.map(r => ({ ...r, trustScore: r.trustScore ? parseFloat(r.trustScore.toString()) : null })));
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/branding/trust", async (req, res) => {
  try {
    const { avgTestimonialScore = 0, progressContentCount = 0, avgResponseTimeMinutes = 0, positiveSentimentPct = 0 } = req.body;
    const testimonialComp = (parseFloat(avgTestimonialScore) / 10) * 100 * 0.30;
    const progressComp = Math.min(100, (parseFloat(progressContentCount) / 8) * 100) * 0.20;
    const responseComp = Math.min(100, avgResponseTimeMinutes > 0 ? (10 / parseFloat(avgResponseTimeMinutes)) * 100 : 100) * 0.25;
    const sentimentComp = Math.min(100, (parseFloat(positiveSentimentPct) / 80) * 100) * 0.25;
    const trustScore = Math.round(testimonialComp + progressComp + responseComp + sentimentComp);
    const [row] = await db.insert(trustScoreRecordsTable).values({ ...req.body, trustScore: trustScore.toString() }).returning();
    res.status(201).json({ ...row, trustScore });
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/branding/trust/:id", async (req, res) => {
  try {
    await db.delete(trustScoreRecordsTable).where(eq(trustScoreRecordsTable.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (err: any) { req.log.error({ err }); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
