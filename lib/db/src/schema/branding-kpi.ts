import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const brandingKpiTable = pgTable("branding_kpi", {
  id: serial("id").primaryKey(),
  bulan: text("bulan").notNull(),
  platform: text("platform").notNull(),
  followers: integer("followers"),
  reach: integer("reach"),
  impresi: integer("impresi"),
  engagement: integer("engagement"),
  postCount: integer("post_count"),
  targetFollowers: integer("target_followers"),
  targetReach: integer("target_reach"),
  targetEngagement: integer("target_engagement"),
  brandingScore: numeric("branding_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBrandingKpiSchema = createInsertSchema(brandingKpiTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBrandingKpi = z.infer<typeof insertBrandingKpiSchema>;
export type BrandingKpi = typeof brandingKpiTable.$inferSelect;
