import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const fasumProgressTable = pgTable("fasum_progress", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  stageCode: text("stage_code"),
  fasumType: text("fasum_type").notNull(),
  progressPercent: real("progress_percent").notNull().default(0),
  notes: text("notes"),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFasumProgressSchema = createInsertSchema(fasumProgressTable).omit({ id: true, createdAt: true });
export type InsertFasumProgress = z.infer<typeof insertFasumProgressSchema>;
export type FasumProgress = typeof fasumProgressTable.$inferSelect;
