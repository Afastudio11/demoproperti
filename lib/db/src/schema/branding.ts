import { pgTable, text, serial, timestamp, integer, numeric, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const corporateBrandRecordsTable = pgTable("branding_corporate_records", {
  id: serial("id").primaryKey(),
  brandName: text("brand_name").notNull(),
  periodYear: integer("period_year").notNull(),
  periodMonth: integer("period_month").notNull(),
  awarenessScore: numeric("awareness_score"),
  consistencyScore: numeric("consistency_score"),
  totalReach: integer("total_reach"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const founderBrandingRecordsTable = pgTable("branding_founder_records", {
  id: serial("id").primaryKey(),
  periodYear: integer("period_year").notNull(),
  periodMonth: integer("period_month").notNull(),
  platform: text("platform").notNull(),
  reach: integer("reach").notNull().default(0),
  impression: integer("impression").notNull().default(0),
  engagement: integer("engagement").notNull().default(0),
  newFollowers: integer("new_followers").notNull().default(0),
  totalFollowers: integer("total_followers").notNull().default(0),
  contentCount: integer("content_count").notNull().default(0),
  leadsFromFounder: integer("leads_from_founder").notNull().default(0),
  bookingsFromFounder: integer("bookings_from_founder").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mediaExposuresTable = pgTable("branding_media_exposures", {
  id: serial("id").primaryKey(),
  mediaName: text("media_name").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  publishDate: text("publish_date"),
  url: text("url"),
  estimatedReach: integer("estimated_reach"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contentItemsTable = pgTable("branding_content_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  projectRelated: text("project_related"),
  platforms: text("platforms"),
  format: text("format"),
  pic: text("pic"),
  productionDeadline: text("production_deadline"),
  scheduledPostDate: text("scheduled_post_date"),
  actualPostDate: text("actual_post_date"),
  productionStatus: text("production_status").notNull().default("idea"),
  caption: text("caption"),
  contentUrl: text("content_url"),
  productionCost: numeric("production_cost").default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const contentStatusHistoryTable = pgTable("branding_content_status_history", {
  id: serial("id").primaryKey(),
  contentId: integer("content_id").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  changedBy: text("changed_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const socialMediaKpiTable = pgTable("branding_social_media_kpi", {
  id: serial("id").primaryKey(),
  periodYear: integer("period_year").notNull(),
  periodMonth: integer("period_month").notNull(),
  platform: text("platform").notNull(),
  reach: integer("reach").notNull().default(0),
  impression: integer("impression").notNull().default(0),
  engagement: integer("engagement").notNull().default(0),
  saves: integer("saves").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  newFollowers: integer("new_followers").notNull().default(0),
  totalFollowers: integer("total_followers").notNull().default(0),
  contentCount: integer("content_count").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contentPerformanceTable = pgTable("branding_content_performance", {
  id: serial("id").primaryKey(),
  contentId: integer("content_id").notNull(),
  platform: text("platform").notNull(),
  reach: integer("reach").notNull().default(0),
  impression: integer("impression").notNull().default(0),
  engagement: integer("engagement").notNull().default(0),
  saves: integer("saves").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  comments: integer("comments").notNull().default(0),
  contentScore: numeric("content_score"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectBrandingScoresTable = pgTable("branding_project_scores", {
  id: serial("id").primaryKey(),
  projectName: text("project_name").notNull(),
  periodYear: integer("period_year").notNull(),
  periodMonth: integer("period_month").notNull(),
  awarenessScore: numeric("awareness_score").notNull().default("0"),
  engagementScore: numeric("engagement_score").notNull().default("0"),
  inquiryScore: numeric("inquiry_score").notNull().default("0"),
  sentimentScore: numeric("sentiment_score").notNull().default("0"),
  totalScore: numeric("total_score"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const prActivitiesTable = pgTable("branding_pr_activities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  partyName: text("party_name"),
  activityDate: text("activity_date"),
  description: text("description"),
  estimatedReach: integer("estimated_reach"),
  cost: numeric("cost").default("0"),
  result: text("result"),
  documentationUrl: text("documentation_url"),
  prScore: numeric("pr_score"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sentimentRecordsTable = pgTable("branding_sentiment_records", {
  id: serial("id").primaryKey(),
  periodYear: integer("period_year").notNull(),
  periodMonth: integer("period_month").notNull(),
  platform: text("platform").notNull(),
  totalAnalyzed: integer("total_analyzed").notNull().default(0),
  positiveCount: integer("positive_count").notNull().default(0),
  neutralCount: integer("neutral_count").notNull().default(0),
  negativeCount: integer("negative_count").notNull().default(0),
  positiveThemes: text("positive_themes"),
  negativeThemes: text("negative_themes"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contentRoiTable = pgTable("branding_content_roi", {
  id: serial("id").primaryKey(),
  contentId: integer("content_id").notNull(),
  leadsFromContent: integer("leads_from_content").notNull().default(0),
  bookingsFromContent: integer("bookings_from_content").notNull().default(0),
  akadFromContent: integer("akad_from_content").notNull().default(0),
  estimatedAkadValue: numeric("estimated_akad_value").default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trustScoreRecordsTable = pgTable("branding_trust_score_records", {
  id: serial("id").primaryKey(),
  periodYear: integer("period_year").notNull(),
  periodMonth: integer("period_month").notNull(),
  newTestimonials: integer("new_testimonials").notNull().default(0),
  avgTestimonialScore: numeric("avg_testimonial_score").notNull().default("0"),
  progressContentCount: integer("progress_content_count").notNull().default(0),
  avgResponseTimeMinutes: numeric("avg_response_time_minutes").notNull().default("0"),
  positiveSentimentPct: numeric("positive_sentiment_pct").notNull().default("0"),
  trustScore: numeric("trust_score"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCorporateBrandRecordSchema = createInsertSchema(corporateBrandRecordsTable).omit({ id: true, createdAt: true });
export const insertFounderBrandingRecordSchema = createInsertSchema(founderBrandingRecordsTable).omit({ id: true, createdAt: true });
export const insertMediaExposureSchema = createInsertSchema(mediaExposuresTable).omit({ id: true, createdAt: true });
export const insertContentItemSchema = createInsertSchema(contentItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContentStatusHistorySchema = createInsertSchema(contentStatusHistoryTable).omit({ id: true, createdAt: true });
export const insertSocialMediaKpiSchema = createInsertSchema(socialMediaKpiTable).omit({ id: true, createdAt: true });
export const insertContentPerformanceSchema = createInsertSchema(contentPerformanceTable).omit({ id: true, createdAt: true });
export const insertProjectBrandingScoreSchema = createInsertSchema(projectBrandingScoresTable).omit({ id: true, createdAt: true });
export const insertPrActivitySchema = createInsertSchema(prActivitiesTable).omit({ id: true, createdAt: true });
export const insertSentimentRecordSchema = createInsertSchema(sentimentRecordsTable).omit({ id: true, createdAt: true });
export const insertContentRoiSchema = createInsertSchema(contentRoiTable).omit({ id: true, createdAt: true });
export const insertTrustScoreRecordSchema = createInsertSchema(trustScoreRecordsTable).omit({ id: true, createdAt: true });

export type ContentItem = typeof contentItemsTable.$inferSelect;
