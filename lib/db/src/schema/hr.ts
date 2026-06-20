import { pgTable, text, serial, timestamp, integer, numeric, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const employeesTable = pgTable("hr_employees", {
  id: serial("id").primaryKey(),
  employeeCode: text("employee_code"),
  name: text("name").notNull(),
  division: text("division").notNull(),
  position: text("position").notNull(),
  directManagerId: integer("direct_manager_id"),
  employmentStatus: text("employment_status").notNull().default("aktif"),
  joinDate: text("join_date"),
  location: text("location"),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const recruitmentNeedsTable = pgTable("hr_recruitment_needs", {
  id: serial("id").primaryKey(),
  positionName: text("position_name").notNull(),
  division: text("division").notNull(),
  location: text("location"),
  headcountNeeded: integer("headcount_needed").notNull().default(1),
  headcountFilled: integer("headcount_filled").notNull().default(0),
  targetHireDate: text("target_hire_date"),
  jobDescription: text("job_description"),
  minimumQualification: text("minimum_qualification"),
  picRecruiter: text("pic_recruiter"),
  status: text("status").notNull().default("dibuka"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recruitmentCandidatesTable = pgTable("hr_recruitment_candidates", {
  id: serial("id").primaryKey(),
  needId: integer("need_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  source: text("source"),
  stage: text("stage").notNull().default("screening_cv"),
  stageDate: text("stage_date"),
  recruiterNotes: text("recruiter_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const kpiDefinitionsTable = pgTable("hr_kpi_definitions", {
  id: serial("id").primaryKey(),
  position: text("position").notNull(),
  division: text("division").notNull(),
  kpiName: text("kpi_name").notNull(),
  description: text("description"),
  unit: text("unit"),
  monthlyTarget: numeric("monthly_target"),
  weight: numeric("weight"),
  dataSource: text("data_source").notNull().default("manual"),
  sourceModule: text("source_module"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const kpiRecordsTable = pgTable("hr_kpi_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  kpiDefinitionId: integer("kpi_definition_id").notNull(),
  periodYear: integer("period_year").notNull(),
  periodMonth: integer("period_month").notNull(),
  target: numeric("target"),
  actual: numeric("actual"),
  achievementPct: numeric("achievement_pct"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const competencyDefinitionsTable = pgTable("hr_competency_definitions", {
  id: serial("id").primaryKey(),
  position: text("position").notNull(),
  division: text("division").notNull(),
  competencyName: text("competency_name").notNull(),
  description: text("description"),
  targetScore: numeric("target_score").notNull().default("80"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const competencyScoresTable = pgTable("hr_competency_scores", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  competencyDefinitionId: integer("competency_definition_id").notNull(),
  actualScore: numeric("actual_score").notNull(),
  assessmentDate: text("assessment_date"),
  assessor: text("assessor"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trainingProgramsTable = pgTable("hr_training_programs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  competencyId: integer("competency_id"),
  trainingDate: text("training_date"),
  durationHours: numeric("duration_hours"),
  organizer: text("organizer"),
  cost: numeric("cost"),
  status: text("status").notNull().default("direncanakan"),
  evaluationScore: numeric("evaluation_score"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trainingParticipantsTable = pgTable("hr_training_participants", {
  id: serial("id").primaryKey(),
  trainingId: integer("training_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const compensationRecordsTable = pgTable("hr_compensation_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  periodYear: integer("period_year").notNull(),
  periodMonth: integer("period_month").notNull(),
  baseSalary: numeric("base_salary").notNull().default("0"),
  hariKerjaPerBulan: integer("hari_kerja_per_bulan").notNull().default(26),
  menitKerjaPerHari: integer("menit_kerja_per_hari").notNull().default(480),
  fixedAllowance: numeric("fixed_allowance").notNull().default("0"),
  performanceBonus: numeric("performance_bonus").notNull().default("0"),
  incentive: numeric("incentive").notNull().default("0"),
  thr: numeric("thr").notNull().default("0"),
  deduction: numeric("deduction").notNull().default("0"),
  potonganTelat: numeric("potongan_telat").notNull().default("0"),
  tambahanLembur: numeric("tambahan_lembur").notNull().default("0"),
  totalTakeHome: numeric("total_take_home").notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cultureRecordsTable = pgTable("hr_culture_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  periodYear: integer("period_year").notNull(),
  periodMonth: integer("period_month").notNull(),
  daysPresent: integer("days_present").notNull().default(0),
  workingDays: integer("working_days").notNull().default(22),
  lateCount: integer("late_count").notNull().default(0),
  disciplineViolations: integer("discipline_violations").notNull().default(0),
  sopComplianceScore: numeric("sop_compliance_score").notNull().default("80"),
  taskCompletionScore: numeric("task_completion_score").notNull().default("80"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workloadRecordsTable = pgTable("hr_workload_records", {
  id: serial("id").primaryKey(),
  division: text("division").notNull(),
  periodYear: integer("period_year").notNull(),
  periodMonth: integer("period_month").notNull(),
  capacity: numeric("capacity").notNull().default("100"),
  actualLoad: numeric("actual_load").notNull(),
  loadDescription: text("load_description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const successionPlansTable = pgTable("hr_succession_plans", {
  id: serial("id").primaryKey(),
  criticalPosition: text("critical_position").notNull(),
  currentHolderId: integer("current_holder_id"),
  backup1Id: integer("backup1_id"),
  backup1Readiness: text("backup1_readiness"),
  backup2Id: integer("backup2_id"),
  backup2Readiness: text("backup2_readiness"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const expansionNeedsTable = pgTable("hr_expansion_needs", {
  id: serial("id").primaryKey(),
  projectName: text("project_name").notNull(),
  positionName: text("position_name").notNull(),
  headcount: integer("headcount").notNull().default(1),
  minCompetencyScore: numeric("min_competency_score").notNull().default("70"),
  minKpiAchievement: numeric("min_kpi_achievement").notNull().default("75"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const flightRiskRecordsTable = pgTable("hr_flight_risk_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  periodYear: integer("period_year").notNull(),
  periodQuarter: integer("period_quarter").notNull(),
  monthsWithoutPromotion: integer("months_without_promotion").notNull().default(0),
  salaryMarketGapPct: numeric("salary_market_gap_pct").notNull().default("0"),
  jobSatisfactionScore: numeric("job_satisfaction_score").notNull().default("7"),
  hasExternalOffer: text("has_external_offer").notNull().default("tidak"),
  flightRiskScore: numeric("flight_risk_score"),
  riskLevel: text("risk_level"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const careerPathsTable = pgTable("hr_career_paths", {
  id: serial("id").primaryKey(),
  division: text("division").notNull(),
  level: integer("level").notNull(),
  positionName: text("position_name").notNull(),
  previousPosition: text("previous_position"),
  minTenureMonths: integer("min_tenure_months").notNull().default(12),
  minKpiAchievement: numeric("min_kpi_achievement").notNull().default("75"),
  minCompetencyScore: numeric("min_competency_score").notNull().default("70"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productivityRecordsTable = pgTable("hr_productivity_records", {
  id: serial("id").primaryKey(),
  periodYear: integer("period_year").notNull(),
  periodMonth: integer("period_month").notNull(),
  totalRevenue: numeric("total_revenue").notNull().default("0"),
  totalProfit: numeric("total_profit").notNull().default("0"),
  totalUnitsSold: integer("total_units_sold").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;

export const insertRecruitmentNeedSchema = createInsertSchema(recruitmentNeedsTable).omit({ id: true, createdAt: true });
export const insertRecruitmentCandidateSchema = createInsertSchema(recruitmentCandidatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertKpiDefinitionSchema = createInsertSchema(kpiDefinitionsTable).omit({ id: true, createdAt: true });
export const insertKpiRecordSchema = createInsertSchema(kpiRecordsTable).omit({ id: true, createdAt: true });
export const insertCompetencyDefinitionSchema = createInsertSchema(competencyDefinitionsTable).omit({ id: true, createdAt: true });
export const insertCompetencyScoreSchema = createInsertSchema(competencyScoresTable).omit({ id: true, createdAt: true });
export const insertTrainingProgramSchema = createInsertSchema(trainingProgramsTable).omit({ id: true, createdAt: true });
export const insertTrainingParticipantSchema = createInsertSchema(trainingParticipantsTable).omit({ id: true, createdAt: true });
export const insertCompensationRecordSchema = createInsertSchema(compensationRecordsTable).omit({ id: true, createdAt: true });
export const insertCultureRecordSchema = createInsertSchema(cultureRecordsTable).omit({ id: true, createdAt: true });
export const insertWorkloadRecordSchema = createInsertSchema(workloadRecordsTable).omit({ id: true, createdAt: true });
export const insertSuccessionPlanSchema = createInsertSchema(successionPlansTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExpansionNeedSchema = createInsertSchema(expansionNeedsTable).omit({ id: true, createdAt: true });
export const insertFlightRiskRecordSchema = createInsertSchema(flightRiskRecordsTable).omit({ id: true, createdAt: true });
export const insertCareerPathSchema = createInsertSchema(careerPathsTable).omit({ id: true, createdAt: true });
export const insertProductivityRecordSchema = createInsertSchema(productivityRecordsTable).omit({ id: true, createdAt: true });

export const attendanceRecordsTable = pgTable("hr_attendance_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id"),
  employeeName: text("employee_name").notNull(),
  projectId: integer("project_id"),
  project: text("project"),
  month: text("month"),
  year: integer("year"),
  day: integer("day").notNull(),
  status: text("status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const overtimeRecordsTable = pgTable("hr_overtime_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id"),
  employeeName: text("employee_name").notNull(),
  projectId: integer("project_id"),
  project: text("project"),
  month: text("month"),
  year: integer("year"),
  day: integer("day").notNull(),
  terlambatMenit: integer("terlambat_menit").notNull().default(0),
  lemburJam: numeric("lembur_jam").notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const individualIssuesTable = pgTable("hr_individual_issues", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  project: text("project"),
  tanggal: text("tanggal"),
  divisi: text("divisi"),
  nama: text("nama"),
  masalah: text("masalah"),
  solusi: text("solusi"),
  deadline: text("deadline"),
  keterangan: text("keterangan"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAttendanceRecordSchema = createInsertSchema(attendanceRecordsTable).omit({ id: true, createdAt: true });
export const insertOvertimeRecordSchema = createInsertSchema(overtimeRecordsTable).omit({ id: true, createdAt: true });
export const insertIndividualIssueSchema = createInsertSchema(individualIssuesTable).omit({ id: true, createdAt: true });
