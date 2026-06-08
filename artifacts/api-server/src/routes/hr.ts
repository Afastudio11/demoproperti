import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  employeesTable,
  recruitmentNeedsTable,
  recruitmentCandidatesTable,
  kpiDefinitionsTable,
  kpiRecordsTable,
  competencyDefinitionsTable,
  competencyScoresTable,
  trainingProgramsTable,
  trainingParticipantsTable,
  compensationRecordsTable,
  cultureRecordsTable,
  workloadRecordsTable,
  successionPlansTable,
  expansionNeedsTable,
  flightRiskRecordsTable,
  careerPathsTable,
  productivityRecordsTable,
} from "@workspace/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

const router: IRouter = Router();

function calcFlightRisk(r: {
  monthsWithoutPromotion: number;
  salaryMarketGapPct: number | string;
  jobSatisfactionScore: number | string;
  hasExternalOffer: string;
}): { score: number; level: string } {
  const months = Math.min(r.monthsWithoutPromotion, 60);
  const monthScore = (months / 60) * 100;
  const gap = Math.max(0, -(Number(r.salaryMarketGapPct)));
  const gapScore = Math.min(gap * 2, 100);
  const satScore = Math.max(0, (10 - Number(r.jobSatisfactionScore)) / 9 * 100);
  const offerScore = r.hasExternalOffer === "ya" ? 100 : r.hasExternalOffer === "mungkin" ? 50 : 0;
  const score = monthScore * 0.25 + gapScore * 0.35 + satScore * 0.25 + offerScore * 0.15;
  const level = score > 70 ? "high" : score >= 40 ? "medium" : "low";
  return { score: Math.round(score * 10) / 10, level };
}

// ─── EMPLOYEES ────────────────────────────────────────────────────────────────
router.get("/hr/employees", async (_req, res) => {
  const rows = await db.select().from(employeesTable).orderBy(employeesTable.name);
  res.json(rows);
});

router.post("/hr/employees", async (req, res) => {
  const body = req.body;
  const code = body.employeeCode || `EMP-${Date.now().toString().slice(-5)}`;
  const [row] = await db.insert(employeesTable).values({ ...body, employeeCode: code }).returning();
  res.json(row);
});

router.put("/hr/employees/:id", async (req, res) => {
  const [row] = await db.update(employeesTable).set(req.body).where(eq(employeesTable.id, Number(req.params.id))).returning();
  res.json(row);
});

router.delete("/hr/employees/:id", async (req, res) => {
  await db.delete(employeesTable).where(eq(employeesTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

// ─── RECRUITMENT ──────────────────────────────────────────────────────────────
router.get("/hr/recruitment/needs", async (_req, res) => {
  const needs = await db.select().from(recruitmentNeedsTable).orderBy(desc(recruitmentNeedsTable.createdAt));
  const candidates = await db.select().from(recruitmentCandidatesTable);
  const result = needs.map(n => ({
    ...n,
    candidates: candidates.filter(c => c.needId === n.id),
  }));
  res.json(result);
});

router.post("/hr/recruitment/needs", async (req, res) => {
  const [row] = await db.insert(recruitmentNeedsTable).values(req.body).returning();
  res.json(row);
});

router.put("/hr/recruitment/needs/:id", async (req, res) => {
  const [row] = await db.update(recruitmentNeedsTable).set(req.body).where(eq(recruitmentNeedsTable.id, Number(req.params.id))).returning();
  res.json(row);
});

router.delete("/hr/recruitment/needs/:id", async (req, res) => {
  await db.delete(recruitmentCandidatesTable).where(eq(recruitmentCandidatesTable.needId, Number(req.params.id)));
  await db.delete(recruitmentNeedsTable).where(eq(recruitmentNeedsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

router.get("/hr/recruitment/candidates", async (_req, res) => {
  const rows = await db.select().from(recruitmentCandidatesTable).orderBy(desc(recruitmentCandidatesTable.createdAt));
  res.json(rows);
});

router.post("/hr/recruitment/candidates", async (req, res) => {
  const [row] = await db.insert(recruitmentCandidatesTable).values(req.body).returning();
  res.json(row);
});

router.put("/hr/recruitment/candidates/:id", async (req, res) => {
  const [row] = await db.update(recruitmentCandidatesTable).set(req.body).where(eq(recruitmentCandidatesTable.id, Number(req.params.id))).returning();
  res.json(row);
});

router.delete("/hr/recruitment/candidates/:id", async (req, res) => {
  await db.delete(recruitmentCandidatesTable).where(eq(recruitmentCandidatesTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

// ─── KPI ─────────────────────────────────────────────────────────────────────
router.get("/hr/kpi/definitions", async (_req, res) => {
  const rows = await db.select().from(kpiDefinitionsTable).orderBy(kpiDefinitionsTable.division, kpiDefinitionsTable.position);
  res.json(rows);
});

router.post("/hr/kpi/definitions", async (req, res) => {
  const [row] = await db.insert(kpiDefinitionsTable).values(req.body).returning();
  res.json(row);
});

router.put("/hr/kpi/definitions/:id", async (req, res) => {
  const [row] = await db.update(kpiDefinitionsTable).set(req.body).where(eq(kpiDefinitionsTable.id, Number(req.params.id))).returning();
  res.json(row);
});

router.delete("/hr/kpi/definitions/:id", async (req, res) => {
  await db.delete(kpiDefinitionsTable).where(eq(kpiDefinitionsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

router.get("/hr/kpi/records", async (_req, res) => {
  const rows = await db.select().from(kpiRecordsTable).orderBy(desc(kpiRecordsTable.periodYear), desc(kpiRecordsTable.periodMonth));
  res.json(rows);
});

router.post("/hr/kpi/records", async (req, res) => {
  const body = req.body;
  const target = Number(body.target) || 0;
  const actual = Number(body.actual) || 0;
  const achievementPct = target > 0 ? Math.min(100, (actual / target) * 100) : 0;
  const [row] = await db.insert(kpiRecordsTable).values({ ...body, achievementPct: achievementPct.toFixed(2) }).returning();
  res.json(row);
});

router.put("/hr/kpi/records/:id", async (req, res) => {
  const body = req.body;
  const target = Number(body.target) || 0;
  const actual = Number(body.actual) || 0;
  const achievementPct = target > 0 ? Math.min(100, (actual / target) * 100) : 0;
  const [row] = await db.update(kpiRecordsTable).set({ ...body, achievementPct: achievementPct.toFixed(2) }).where(eq(kpiRecordsTable.id, Number(req.params.id))).returning();
  res.json(row);
});

router.delete("/hr/kpi/records/:id", async (req, res) => {
  await db.delete(kpiRecordsTable).where(eq(kpiRecordsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

// ─── COMPETENCY ───────────────────────────────────────────────────────────────
router.get("/hr/competency/definitions", async (_req, res) => {
  const rows = await db.select().from(competencyDefinitionsTable).orderBy(competencyDefinitionsTable.division);
  res.json(rows);
});

router.post("/hr/competency/definitions", async (req, res) => {
  const [row] = await db.insert(competencyDefinitionsTable).values(req.body).returning();
  res.json(row);
});

router.put("/hr/competency/definitions/:id", async (req, res) => {
  const [row] = await db.update(competencyDefinitionsTable).set(req.body).where(eq(competencyDefinitionsTable.id, Number(req.params.id))).returning();
  res.json(row);
});

router.delete("/hr/competency/definitions/:id", async (req, res) => {
  await db.delete(competencyDefinitionsTable).where(eq(competencyDefinitionsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

router.get("/hr/competency/scores", async (_req, res) => {
  const rows = await db.select().from(competencyScoresTable).orderBy(desc(competencyScoresTable.createdAt));
  res.json(rows);
});

router.post("/hr/competency/scores", async (req, res) => {
  const [row] = await db.insert(competencyScoresTable).values(req.body).returning();
  res.json(row);
});

router.put("/hr/competency/scores/:id", async (req, res) => {
  const [row] = await db.update(competencyScoresTable).set(req.body).where(eq(competencyScoresTable.id, Number(req.params.id))).returning();
  res.json(row);
});

router.delete("/hr/competency/scores/:id", async (req, res) => {
  await db.delete(competencyScoresTable).where(eq(competencyScoresTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

// ─── TRAINING ────────────────────────────────────────────────────────────────
router.get("/hr/training/programs", async (_req, res) => {
  const programs = await db.select().from(trainingProgramsTable).orderBy(desc(trainingProgramsTable.createdAt));
  const participants = await db.select().from(trainingParticipantsTable);
  const result = programs.map(p => ({
    ...p,
    participantIds: participants.filter(tp => tp.trainingId === p.id).map(tp => tp.employeeId),
  }));
  res.json(result);
});

router.post("/hr/training/programs", async (req, res) => {
  const { participantIds, ...body } = req.body;
  const [prog] = await db.insert(trainingProgramsTable).values(body).returning();
  if (participantIds?.length) {
    await db.insert(trainingParticipantsTable).values(participantIds.map((eid: number) => ({ trainingId: prog.id, employeeId: eid })));
  }
  res.json(prog);
});

router.put("/hr/training/programs/:id", async (req, res) => {
  const { participantIds, ...body } = req.body;
  const id = Number(req.params.id);
  const [prog] = await db.update(trainingProgramsTable).set(body).where(eq(trainingProgramsTable.id, id)).returning();
  if (participantIds !== undefined) {
    await db.delete(trainingParticipantsTable).where(eq(trainingParticipantsTable.trainingId, id));
    if (participantIds.length) {
      await db.insert(trainingParticipantsTable).values(participantIds.map((eid: number) => ({ trainingId: id, employeeId: eid })));
    }
  }
  res.json(prog);
});

router.delete("/hr/training/programs/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(trainingParticipantsTable).where(eq(trainingParticipantsTable.trainingId, id));
  await db.delete(trainingProgramsTable).where(eq(trainingProgramsTable.id, id));
  res.json({ ok: true });
});

// ─── COMPENSATION ────────────────────────────────────────────────────────────
router.get("/hr/compensation", async (_req, res) => {
  const rows = await db.select().from(compensationRecordsTable).orderBy(desc(compensationRecordsTable.periodYear), desc(compensationRecordsTable.periodMonth));
  res.json(rows);
});

router.post("/hr/compensation", async (req, res) => {
  const body = req.body;
  const total = (Number(body.baseSalary) || 0) + (Number(body.fixedAllowance) || 0) + (Number(body.performanceBonus) || 0) + (Number(body.incentive) || 0) + (Number(body.thr) || 0) - (Number(body.deduction) || 0);
  const [row] = await db.insert(compensationRecordsTable).values({ ...body, totalTakeHome: total.toString() }).returning();
  res.json(row);
});

router.put("/hr/compensation/:id", async (req, res) => {
  const body = req.body;
  const total = (Number(body.baseSalary) || 0) + (Number(body.fixedAllowance) || 0) + (Number(body.performanceBonus) || 0) + (Number(body.incentive) || 0) + (Number(body.thr) || 0) - (Number(body.deduction) || 0);
  const [row] = await db.update(compensationRecordsTable).set({ ...body, totalTakeHome: total.toString() }).where(eq(compensationRecordsTable.id, Number(req.params.id))).returning();
  res.json(row);
});

router.delete("/hr/compensation/:id", async (req, res) => {
  await db.delete(compensationRecordsTable).where(eq(compensationRecordsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

// ─── CULTURE ─────────────────────────────────────────────────────────────────
router.get("/hr/culture", async (_req, res) => {
  const rows = await db.select().from(cultureRecordsTable).orderBy(desc(cultureRecordsTable.periodYear), desc(cultureRecordsTable.periodMonth));
  res.json(rows);
});

router.post("/hr/culture", async (req, res) => {
  const [row] = await db.insert(cultureRecordsTable).values(req.body).returning();
  res.json(row);
});

router.put("/hr/culture/:id", async (req, res) => {
  const [row] = await db.update(cultureRecordsTable).set(req.body).where(eq(cultureRecordsTable.id, Number(req.params.id))).returning();
  res.json(row);
});

router.delete("/hr/culture/:id", async (req, res) => {
  await db.delete(cultureRecordsTable).where(eq(cultureRecordsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

// ─── WORKLOAD ────────────────────────────────────────────────────────────────
router.get("/hr/workload", async (_req, res) => {
  const rows = await db.select().from(workloadRecordsTable).orderBy(desc(workloadRecordsTable.periodYear), desc(workloadRecordsTable.periodMonth), workloadRecordsTable.division);
  res.json(rows);
});

router.post("/hr/workload", async (req, res) => {
  const [row] = await db.insert(workloadRecordsTable).values(req.body).returning();
  res.json(row);
});

router.put("/hr/workload/:id", async (req, res) => {
  const [row] = await db.update(workloadRecordsTable).set(req.body).where(eq(workloadRecordsTable.id, Number(req.params.id))).returning();
  res.json(row);
});

router.delete("/hr/workload/:id", async (req, res) => {
  await db.delete(workloadRecordsTable).where(eq(workloadRecordsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

// ─── SUCCESSION ───────────────────────────────────────────────────────────────
router.get("/hr/succession", async (_req, res) => {
  const rows = await db.select().from(successionPlansTable).orderBy(successionPlansTable.criticalPosition);
  res.json(rows);
});

router.post("/hr/succession", async (req, res) => {
  const [row] = await db.insert(successionPlansTable).values(req.body).returning();
  res.json(row);
});

router.put("/hr/succession/:id", async (req, res) => {
  const [row] = await db.update(successionPlansTable).set(req.body).where(eq(successionPlansTable.id, Number(req.params.id))).returning();
  res.json(row);
});

router.delete("/hr/succession/:id", async (req, res) => {
  await db.delete(successionPlansTable).where(eq(successionPlansTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

// ─── EXPANSION NEEDS ─────────────────────────────────────────────────────────
router.get("/hr/expansion", async (_req, res) => {
  const rows = await db.select().from(expansionNeedsTable).orderBy(expansionNeedsTable.projectName, expansionNeedsTable.positionName);
  res.json(rows);
});

router.post("/hr/expansion", async (req, res) => {
  const [row] = await db.insert(expansionNeedsTable).values(req.body).returning();
  res.json(row);
});

router.put("/hr/expansion/:id", async (req, res) => {
  const [row] = await db.update(expansionNeedsTable).set(req.body).where(eq(expansionNeedsTable.id, Number(req.params.id))).returning();
  res.json(row);
});

router.delete("/hr/expansion/:id", async (req, res) => {
  await db.delete(expansionNeedsTable).where(eq(expansionNeedsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

// ─── FLIGHT RISK ──────────────────────────────────────────────────────────────
router.get("/hr/flight-risk", async (_req, res) => {
  const rows = await db.select().from(flightRiskRecordsTable).orderBy(desc(flightRiskRecordsTable.periodYear), desc(flightRiskRecordsTable.periodQuarter));
  res.json(rows);
});

router.post("/hr/flight-risk", async (req, res) => {
  const body = req.body;
  const { score, level } = calcFlightRisk(body);
  const [row] = await db.insert(flightRiskRecordsTable).values({ ...body, flightRiskScore: score.toString(), riskLevel: level }).returning();
  res.json(row);
});

router.put("/hr/flight-risk/:id", async (req, res) => {
  const body = req.body;
  const { score, level } = calcFlightRisk(body);
  const [row] = await db.update(flightRiskRecordsTable).set({ ...body, flightRiskScore: score.toString(), riskLevel: level }).where(eq(flightRiskRecordsTable.id, Number(req.params.id))).returning();
  res.json(row);
});

router.delete("/hr/flight-risk/:id", async (req, res) => {
  await db.delete(flightRiskRecordsTable).where(eq(flightRiskRecordsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

// ─── CAREER PATHS ────────────────────────────────────────────────────────────
router.get("/hr/career-paths", async (_req, res) => {
  const rows = await db.select().from(careerPathsTable).orderBy(careerPathsTable.division, careerPathsTable.level);
  res.json(rows);
});

router.post("/hr/career-paths", async (req, res) => {
  const [row] = await db.insert(careerPathsTable).values(req.body).returning();
  res.json(row);
});

router.put("/hr/career-paths/:id", async (req, res) => {
  const [row] = await db.update(careerPathsTable).set(req.body).where(eq(careerPathsTable.id, Number(req.params.id))).returning();
  res.json(row);
});

router.delete("/hr/career-paths/:id", async (req, res) => {
  await db.delete(careerPathsTable).where(eq(careerPathsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

// ─── PRODUCTIVITY ─────────────────────────────────────────────────────────────
router.get("/hr/productivity", async (_req, res) => {
  const rows = await db.select().from(productivityRecordsTable).orderBy(desc(productivityRecordsTable.periodYear), desc(productivityRecordsTable.periodMonth));
  res.json(rows);
});

router.post("/hr/productivity", async (req, res) => {
  const [row] = await db.insert(productivityRecordsTable).values(req.body).returning();
  res.json(row);
});

router.put("/hr/productivity/:id", async (req, res) => {
  const [row] = await db.update(productivityRecordsTable).set(req.body).where(eq(productivityRecordsTable.id, Number(req.params.id))).returning();
  res.json(row);
});

router.delete("/hr/productivity/:id", async (req, res) => {
  await db.delete(productivityRecordsTable).where(eq(productivityRecordsTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

// ─── HR DASHBOARD ─────────────────────────────────────────────────────────────
router.get("/hr/dashboard", async (_req, res) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const employees = await db.select().from(employeesTable);
  const activeEmployees = employees.filter(e => e.employmentStatus === "aktif" || e.employmentStatus === "tetap" || e.employmentStatus === "kontrak" || e.employmentStatus === "probasi");
  const totalActive = activeEmployees.length;

  const kpiRecords = await db.select().from(kpiRecordsTable).where(and(eq(kpiRecordsTable.periodYear, year), eq(kpiRecordsTable.periodMonth, month)));
  
  const employeeKpiMap: Record<number, number[]> = {};
  for (const r of kpiRecords) {
    if (!employeeKpiMap[r.employeeId]) employeeKpiMap[r.employeeId] = [];
    employeeKpiMap[r.employeeId].push(Number(r.achievementPct) || 0);
  }
  
  const employeeAvgKpi: { id: number; avg: number }[] = Object.entries(employeeKpiMap).map(([id, vals]) => ({
    id: Number(id),
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
  }));
  
  const avgKpi = employeeAvgKpi.length > 0 ? employeeAvgKpi.reduce((s, e) => s + e.avg, 0) / employeeAvgKpi.length : 0;
  
  const sorted = [...employeeAvgKpi].sort((a, b) => b.avg - a.avg);
  const topId = sorted[0]?.id;
  const bottomId = sorted[sorted.length - 1]?.id;
  const topEmp = employees.find(e => e.id === topId);
  const bottomEmp = employees.find(e => e.id === bottomId);

  const openPositions = await db.select().from(recruitmentNeedsTable).where(eq(recruitmentNeedsTable.status, "dibuka"));
  const totalOpen = openPositions.reduce((s, n) => s + (n.headcountNeeded - n.headcountFilled), 0);

  const comp = await db.select().from(compensationRecordsTable).where(and(eq(compensationRecordsTable.periodYear, year), eq(compensationRecordsTable.periodMonth, month)));
  const totalPayroll = comp.reduce((s, c) => s + Number(c.totalTakeHome), 0);

  const prod = await db.select().from(productivityRecordsTable).where(and(eq(productivityRecordsTable.periodYear, year), eq(productivityRecordsTable.periodMonth, month)));
  const revenuePerEmployee = prod[0] && totalActive > 0 ? Number(prod[0].totalRevenue) / totalActive : 0;

  const recruitNeeds = await db.select().from(recruitmentNeedsTable).where(eq(recruitmentNeedsTable.status, "dibuka"));
  const totalNeeded = recruitNeeds.reduce((s, n) => s + n.headcountNeeded, 0);
  const totalFilled = recruitNeeds.reduce((s, n) => s + n.headcountFilled, 0);
  const recruitReadiness = totalNeeded > 0 ? (totalFilled / totalNeeded) * 100 : 100;

  const compScores = await db.select().from(competencyScoresTable);
  const compDefs = await db.select().from(competencyDefinitionsTable);
  const empCompScores: Record<number, number[]> = {};
  for (const sc of compScores) {
    const def = compDefs.find(d => d.id === sc.competencyDefinitionId);
    if (!def) continue;
    const ratio = Math.min(Number(sc.actualScore) / Number(def.targetScore), 1) * 100;
    if (!empCompScores[sc.employeeId]) empCompScores[sc.employeeId] = [];
    empCompScores[sc.employeeId].push(ratio);
  }
  const avgCompetency = Object.values(empCompScores).length > 0
    ? Object.values(empCompScores).map(v => v.reduce((a, b) => a + b, 0) / v.length).reduce((a, b) => a + b, 0) / Object.values(empCompScores).length
    : 0;

  const cultureRecs = await db.select().from(cultureRecordsTable).where(and(eq(cultureRecordsTable.periodYear, year), eq(cultureRecordsTable.periodMonth, month)));
  const cultureScores = cultureRecs.map(c => {
    const attendRate = c.workingDays > 0 ? (c.daysPresent / c.workingDays) * 100 : 0;
    return attendRate * 0.30 + Number(c.sopComplianceScore) * 0.35 + Number(c.taskCompletionScore) * 0.35;
  });
  const avgCulture = cultureScores.length > 0 ? cultureScores.reduce((a, b) => a + b, 0) / cultureScores.length : 0;

  const prodTarget = 500_000_000;
  const productivityScore = prod[0] ? Math.min((Number(prod[0].totalRevenue) / totalActive) / prodTarget * 100, 100) : 0;

  const hcScore = avgKpi * 0.30 + productivityScore * 0.20 + avgCompetency * 0.20 + avgCulture * 0.15 + recruitReadiness * 0.15;
  const hcStatus = hcScore > 80 ? "SEHAT" : hcScore >= 60 ? "WASPADA" : "KRITIS";

  const workloads = await db.select().from(workloadRecordsTable).where(and(eq(workloadRecordsTable.periodYear, year), eq(workloadRecordsTable.periodMonth, month)));

  const flightRisks = await db.select().from(flightRiskRecordsTable).where(eq(flightRiskRecordsTable.periodYear, year));
  const medHighRisk = flightRisks.filter(f => f.riskLevel === "medium" || f.riskLevel === "high");

  const expansionNeeds = await db.select().from(expansionNeedsTable);
  const projectMap: Record<string, { needed: number; available: number }> = {};
  for (const n of expansionNeeds) {
    if (!projectMap[n.projectName]) projectMap[n.projectName] = { needed: 0, available: 0 };
    projectMap[n.projectName].needed += n.headcount;
    const candidates = activeEmployees.filter(e => {
      const empAvgKpi = employeeKpiMap[e.id] ? employeeKpiMap[e.id].reduce((a, b) => a + b, 0) / employeeKpiMap[e.id].length : 0;
      const empAvgComp = empCompScores[e.id] ? empCompScores[e.id].reduce((a, b) => a + b, 0) / empCompScores[e.id].length : 0;
      return empAvgKpi >= Number(n.minKpiAchievement) && empAvgComp >= Number(n.minCompetencyScore);
    });
    projectMap[n.projectName].available += Math.min(candidates.length, n.headcount);
  }
  const expansionReadiness = Object.values(projectMap).length > 0
    ? Object.values(projectMap).reduce((s, p) => s + (p.needed > 0 ? p.available / p.needed : 1), 0) / Object.values(projectMap).length * 100
    : 0;

  const talentMap = activeEmployees.map(e => {
    const perfScore = employeeKpiMap[e.id] ? employeeKpiMap[e.id].reduce((a, b) => a + b, 0) / employeeKpiMap[e.id].length : 0;
    const compScore = empCompScores[e.id] ? empCompScores[e.id].reduce((a, b) => a + b, 0) / empCompScores[e.id].length : 0;
    const cultScore = (() => {
      const c = cultureRecs.find(cr => cr.employeeId === e.id);
      if (!c) return 0;
      return (c.daysPresent / (c.workingDays || 1) * 100) * 0.30 + Number(c.sopComplianceScore) * 0.35 + Number(c.taskCompletionScore) * 0.35;
    })();
    const potentialScore = compScore * 0.40 + 50 * 0.30 + cultScore * 0.30;
    return { id: e.id, name: e.name, division: e.division, position: e.position, performanceScore: Math.round(perfScore * 10) / 10, potentialScore: Math.round(potentialScore * 10) / 10 };
  });

  res.json({
    hcScore: Math.round(hcScore * 10) / 10,
    hcStatus,
    hcBreakdown: {
      kpiAchievement: Math.round(avgKpi * 10) / 10,
      productivity: Math.round(productivityScore * 10) / 10,
      competency: Math.round(avgCompetency * 10) / 10,
      culture: Math.round(avgCulture * 10) / 10,
      recruitment: Math.round(recruitReadiness * 10) / 10,
    },
    totalActive,
    avgKpiAchievement: Math.round(avgKpi * 10) / 10,
    topPerformer: topEmp ? { name: topEmp.name, score: Math.round((sorted[0]?.avg ?? 0) * 10) / 10 } : null,
    bottomPerformer: bottomEmp ? { name: bottomEmp.name, score: Math.round((sorted[sorted.length - 1]?.avg ?? 0) * 10) / 10 } : null,
    openPositions: totalOpen,
    totalPayroll,
    revenuePerEmployee: Math.round(revenuePerEmployee),
    expansionReadiness: Math.round(expansionReadiness * 10) / 10,
    workloads,
    flightRiskAlerts: medHighRisk.map(f => {
      const emp = employees.find(e => e.id === f.employeeId);
      return { ...f, employeeName: emp?.name ?? "?", employeeDivision: emp?.division ?? "" };
    }),
    talentMap,
    expansionByProject: Object.entries(projectMap).map(([name, p]) => ({
      project: name,
      needed: p.needed,
      available: p.available,
      readinessPct: p.needed > 0 ? Math.round((p.available / p.needed) * 100) : 100,
    })),
  });
});

export default router;
