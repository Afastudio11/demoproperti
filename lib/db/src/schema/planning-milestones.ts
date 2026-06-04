import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planningMilestonesTable = pgTable("planning_milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  phase: text("phase").notNull(),
  taskName: text("task_name").notNull(),
  targetDate: text("target_date"),
  actualDate: text("actual_date"),
  status: text("status").notNull().default("belum_mulai"),
  progressPct: integer("progress_pct").default(0),
  unitsDone: integer("units_done").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlanningMilestoneSchema = createInsertSchema(planningMilestonesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlanningMilestone = z.infer<typeof insertPlanningMilestoneSchema>;
export type PlanningMilestone = typeof planningMilestonesTable.$inferSelect;
