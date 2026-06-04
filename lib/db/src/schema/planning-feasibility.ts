import { pgTable, text, serial, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planningFeasibilityTable = pgTable("planning_feasibility", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  landCost: real("land_cost"),
  landPrepCost: real("land_prep_cost"),
  constructionCostPerUnit: real("construction_cost_per_unit"),
  fasumRoadCost: real("fasum_road_cost"),
  permitCost: real("permit_cost"),
  marketingCost: real("marketing_cost"),
  overheadCost: real("overhead_cost"),
  contingencyPct: real("contingency_pct"),
  sellingPricePerUnit: real("selling_price_per_unit"),
  totalUnits: integer("total_units"),
  bookingFeePerUnit: real("booking_fee_per_unit"),
  salesPerMonth: integer("sales_per_month"),
  kprPct: real("kpr_pct"),
  cashHardPct: real("cash_hard_pct"),
  cashInstallmentPct: real("cash_installment_pct"),
  discountRate: real("discount_rate").default(12),
  totalRevenue: real("total_revenue"),
  totalCost: real("total_cost"),
  grossProfit: real("gross_profit"),
  margin: real("margin"),
  roi: real("roi"),
  irr: real("irr"),
  npv: real("npv"),
  paybackPeriod: integer("payback_period"),
  bepUnits: integer("bep_units"),
  peakFunding: real("peak_funding"),
  riskScore: real("risk_score"),
  recommendation: text("recommendation"),
  isApproved: boolean("is_approved").default(false),
  approvedAt: text("approved_at"),
  catatan: text("catatan"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlanningFeasibilitySchema = createInsertSchema(planningFeasibilityTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlanningFeasibility = z.infer<typeof insertPlanningFeasibilitySchema>;
export type PlanningFeasibility = typeof planningFeasibilityTable.$inferSelect;
