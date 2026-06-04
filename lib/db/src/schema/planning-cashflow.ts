import { pgTable, serial, timestamp, integer, real, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planningCashflowTable = pgTable("planning_cashflow", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  monthNumber: integer("month_number").notNull(),
  monthLabel: text("month_label"),
  landCostOut: real("land_cost_out").default(0),
  constructionCostOut: real("construction_cost_out").default(0),
  marketingCostOut: real("marketing_cost_out").default(0),
  operationalCostOut: real("operational_cost_out").default(0),
  kppInstallmentOut: real("kpp_installment_out").default(0),
  bookingFeeIn: real("booking_fee_in").default(0),
  htKprIn: real("ht_kpr_in").default(0),
  downPaymentIn: real("down_payment_in").default(0),
  kppDisbursementIn: real("kpp_disbursement_in").default(0),
  conservativeUnits: real("conservative_units").default(0),
  moderateUnits: real("moderate_units").default(0),
  aggressiveUnits: real("aggressive_units").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlanningCashflowSchema = createInsertSchema(planningCashflowTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlanningCashflow = z.infer<typeof insertPlanningCashflowSchema>;
export type PlanningCashflow = typeof planningCashflowTable.$inferSelect;
