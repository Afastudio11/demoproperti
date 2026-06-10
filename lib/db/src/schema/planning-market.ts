import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planningMarketTable = pgTable("planning_market", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  kabupaten: text("kabupaten").notNull(),
  kelurahan: text("kelurahan"),
  kecamatan: text("kecamatan"),
  population: integer("population"),
  populationGrowth: real("population_growth"),
  backlogHousing: integer("backlog_housing"),
  marriageRate: integer("marriage_rate"),
  kkCount: integer("kk_count"),
  kkGrowth: real("kk_growth"),
  density: real("density"),
  umk: real("umk"),
  avgIncome: real("avg_income"),
  asnCount: integer("asn_count"),
  privateEmployees: integer("private_employees"),
  umkmCount: integer("umkm_count"),
  unemploymentRate: real("unemployment_rate"),
  flppRealization: integer("flpp_realization"),
  flppEligible: real("flpp_eligible"),
  purchasePower: real("purchase_power"),
  activeDevelopers: integer("active_developers"),
  activeBanks: integer("active_banks"),
  targetPrice: real("target_price"),
  roadAccess: real("road_access"),
  nearTolPlaza: real("near_tol_plaza"),
  nearSchool: real("near_school"),
  nearMarket: real("near_market"),
  sampleSize: integer("sample_size"),
  flppPreference: real("flpp_preference"),
  cashPreference: real("cash_preference"),
  demandScore: real("demand_score"),
  marketPotentialScore: real("market_potential_score"),
  marketRecommendation: text("market_recommendation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const planningCompetitorsTable = pgTable("planning_competitors", {
  id: serial("id").primaryKey(),
  marketId: integer("market_id").notNull(),
  name: text("name").notNull(),
  price: real("price"),
  productType: text("product_type"),
  units: integer("units"),
  absorption: real("absorption"),
  distance: real("distance"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlanningMarketSchema = createInsertSchema(planningMarketTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlanningCompetitorSchema = createInsertSchema(planningCompetitorsTable).omit({ id: true, createdAt: true });
export type InsertPlanningMarket = z.infer<typeof insertPlanningMarketSchema>;
export type PlanningMarket = typeof planningMarketTable.$inferSelect;
export type InsertPlanningCompetitor = z.infer<typeof insertPlanningCompetitorSchema>;
export type PlanningCompetitor = typeof planningCompetitorsTable.$inferSelect;
