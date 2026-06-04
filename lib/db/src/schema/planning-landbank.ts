import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planningLandBankTable = pgTable("planning_land_bank", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  name: text("name").notNull(),
  status: text("status").notNull().default("land_bank"),
  landArea: real("land_area"),
  availableUnits: integer("available_units"),
  acquisitionPrice: real("acquisition_price"),
  targetStartDate: text("target_start_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const planningExpansionTable = pgTable("planning_expansion", {
  id: serial("id").primaryKey(),
  scenarioName: text("scenario_name").notNull(),
  description: text("description"),
  estimatedRoi: real("estimated_roi"),
  riskScore: real("risk_score"),
  cashflowImpact: text("cashflow_impact"),
  sdmScore: real("sdm_score"),
  sopScore: real("sop_score"),
  dashboardScore: real("dashboard_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlanningLandBankSchema = createInsertSchema(planningLandBankTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlanningExpansionSchema = createInsertSchema(planningExpansionTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlanningLandBank = z.infer<typeof insertPlanningLandBankSchema>;
export type PlanningLandBank = typeof planningLandBankTable.$inferSelect;
export type InsertPlanningExpansion = z.infer<typeof insertPlanningExpansionSchema>;
export type PlanningExpansion = typeof planningExpansionTable.$inferSelect;
