import { pgTable, text, serial, timestamp, integer, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planningSiteplansTable = pgTable("planning_siteplans", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  landProspectId: integer("land_prospect_id"),
  title: text("title").notNull().default("Siteplan"),
  imageDataUrl: text("image_data_url"),
  mainPolygon: jsonb("main_polygon"),
  imageTransform: jsonb("image_transform").$type<Record<string, unknown>>(),
  source: text("source").notNull().default("upload"),
  isLocked: integer("is_locked").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const planningSiteplanShapesTable = pgTable("planning_siteplan_shapes", {
  id: serial("id").primaryKey(),
  siteplanId: integer("siteplan_id").notNull(),
  projectId: integer("project_id").notNull(),
  shapeType: text("shape_type").notNull().default("unit"),
  label: text("label").notNull(),
  polygon: jsonb("polygon").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ownerName: text("owner_name"),
  landArea: real("land_area"),
  price: real("price"),
  legalStatus: text("legal_status"),
  purchaseStatus: text("purchase_status").default("belum_dibeli"),
  plannedUnits: integer("planned_units"),
  unitId: integer("unit_id"),
  blockCode: text("block_code"),
  unitType: text("unit_type"),
  subkonName: text("subkon_name"),
  unitStatus: text("unit_status").default("belum_dibuka"),
  progress: real("progress").default(0),
  customerId: integer("customer_id"),
  isLocked: integer("is_locked").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlanningSiteplanSchema = createInsertSchema(planningSiteplansTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlanningSiteplanShapeSchema = createInsertSchema(planningSiteplanShapesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlanningSiteplan = z.infer<typeof insertPlanningSiteplanSchema>;
export type PlanningSiteplan = typeof planningSiteplansTable.$inferSelect;
export type InsertPlanningSiteplanShape = z.infer<typeof insertPlanningSiteplanShapeSchema>;
export type PlanningSiteplanShape = typeof planningSiteplanShapesTable.$inferSelect;
