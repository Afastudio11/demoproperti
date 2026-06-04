import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planningProductTable = pgTable("planning_product", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  houseType: text("house_type").notNull(),
  buildingArea: real("building_area"),
  kavlingArea: real("kavling_area"),
  sellingPrice: real("selling_price"),
  unitCount: integer("unit_count"),
  targetSegment: text("target_segment"),
  competitorPrice: real("competitor_price"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlanningProductSchema = createInsertSchema(planningProductTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlanningProduct = z.infer<typeof insertPlanningProductSchema>;
export type PlanningProduct = typeof planningProductTable.$inferSelect;
