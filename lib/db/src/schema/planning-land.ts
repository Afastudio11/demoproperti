import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planningLandTable = pgTable("planning_land", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  landArea: real("land_area"),
  landPriceTotal: real("land_price_total"),
  landShape: text("land_shape"),
  contour: text("contour"),
  roadWidth: real("road_width"),
  kavlingArea: real("kavling_area"),
  legalStatus: text("legal_status"),
  notes: text("notes"),
  roadArea: real("road_area"),
  fasumArea: real("fasum_area"),
  effectiveArea: real("effective_area"),
  maxUnits: integer("max_units"),
  landPricePerUnit: real("land_price_per_unit"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlanningLandSchema = createInsertSchema(planningLandTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlanningLand = z.infer<typeof insertPlanningLandSchema>;
export type PlanningLand = typeof planningLandTable.$inferSelect;
