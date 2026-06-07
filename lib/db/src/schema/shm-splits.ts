import { pgTable, text, serial, timestamp, integer, date } from "drizzle-orm/pg-core";

export const shmSplitRecordsTable = pgTable("shm_split_records", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  landStageId: integer("land_stage_id"),
  stageCode: text("stage_code").notNull(), // T1, T2, dll
  targetSplit: integer("target_split").notNull().default(0),
  realizedSplit: integer("realized_split").notNull().default(0),
  lastUpdated: date("last_updated"),
  pic: text("pic"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ShmSplitRecord = typeof shmSplitRecordsTable.$inferSelect;
