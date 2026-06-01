import { pgTable, text, serial, timestamp, integer, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const feasibilityStudiesTable = pgTable("feasibility_studies", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  hpp: real("hpp").notNull(),
  roi: real("roi").notNull(),
  margin: real("margin").notNull(),
  cashflow: real("cashflow"),
  bep: real("bep"),
  rab: real("rab"),
  rabVariance: real("rab_variance"),
  isApproved: boolean("is_approved").notNull().default(false),
  approvedAt: text("approved_at"),
  catatan: text("catatan"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFeasibilityStudySchema = createInsertSchema(feasibilityStudiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFeasibilityStudy = z.infer<typeof insertFeasibilityStudySchema>;
export type FeasibilityStudy = typeof feasibilityStudiesTable.$inferSelect;
