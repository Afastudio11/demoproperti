import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const userSessionsTable = pgTable("user_sessions", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});
