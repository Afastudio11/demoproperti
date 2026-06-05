import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const expansionTargetsTable = pgTable("expansion_targets", {
  id: serial("id").primaryKey(),
  kabupaten: text("kabupaten").notNull().unique(),
  hargaPinggirMin: integer("harga_pinggir_min"),
  hargaPinggirMax: integer("harga_pinggir_max"),
  hargaPusatMin: integer("harga_pusat_min"),
  hargaPusatMax: integer("harga_pusat_max"),
  catatan: text("catatan"),
  flppSuitable: integer("flpp_suitable").default(0),
  tier: text("tier").notNull().default("tier2"),
  heuristicScore: integer("heuristic_score").notNull().default(0),
  aiScore: integer("ai_score"),
  aiRationale: text("ai_rationale"),
  aiKeunggulan: text("ai_keunggulan"),
  aiRisiko: text("ai_risiko"),
  aiRekomendasiLangkah: text("ai_rekomendasi_langkah"),
  lastAiAnalysis: timestamp("last_ai_analysis", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ExpansionTarget = typeof expansionTargetsTable.$inferSelect;
