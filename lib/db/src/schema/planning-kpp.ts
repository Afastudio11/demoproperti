import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planningKppTable = pgTable("planning_kpp", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  bankName: text("bank_name"),
  approvedAmount: real("approved_amount"),
  disbDate1: text("disb_date_1"),
  disbDate2: text("disb_date_2"),
  disbDate3: text("disb_date_3"),
  interestRate: real("interest_rate"),
  tenureMonths: integer("tenure_months"),
  adminFee: real("admin_fee"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const planningHtTable = pgTable("planning_ht", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  buyerName: text("buyer_name").notNull(),
  unitNumber: text("unit_number"),
  akadDate: text("akad_date"),
  htAmount: real("ht_amount"),
  kprBank: text("kpr_bank"),
  htStatus: text("ht_status").default("proses"),
  htDisbDate: text("ht_disb_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlanningKppSchema = createInsertSchema(planningKppTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlanningHtSchema = createInsertSchema(planningHtTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlanningKpp = z.infer<typeof insertPlanningKppSchema>;
export type PlanningKpp = typeof planningKppTable.$inferSelect;
export type InsertPlanningHt = z.infer<typeof insertPlanningHtSchema>;
export type PlanningHt = typeof planningHtTable.$inferSelect;
