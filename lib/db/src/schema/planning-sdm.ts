import { pgTable, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const planningSDMTable = pgTable("planning_sdm", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "cascade" }),
  siteManagers: integer("site_managers").default(0),
  supervisors: integer("supervisors").default(0),
  workers: integer("workers").default(0),
  workersPerUnit: real("workers_per_unit").default(3),
  unitsPerManager: integer("units_per_manager").default(20),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlanningSDMSchema = createInsertSchema(planningSDMTable).omit({ id: true, updatedAt: true });
export type InsertPlanningSDM = z.infer<typeof insertPlanningSDMSchema>;
export type PlanningSDM = typeof planningSDMTable.$inferSelect;
