/**
 * Seed material_out data dengan subkon_name untuk perbandingan efisiensi per unit
 * Jalankan dari: cd lib/db && node seed-material-subkon.mjs
 */
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sql = (q, p = []) => pool.query(q, p);

// Mapping subkon ke material IDs (dari prod_material_master)
// ID dari DB: Semen=1, Bata=2, Pasir=3, BatuSplit=4, BatuKali=5, BesiD10=6, BesiD13=7, BesiHollow=8
//             KeramikLantai=9, KeramikDinding=10, CatDalam=11, CatLuar=12
//             Pipa4"=13, Pipa2"=14, Kloset=15
//             Kabel2x2.5=16, Kabel3x2.5=17, MCB=18
//             AtapGenteng=19, RangkaBaja=20

const SUBKON_MATERIALS = {
  "CV Bangunan Jaya Sulsel":      [1, 2, 3, 4, 5, 6, 7, 8],  // Struktur
  "CV Mitra Finishing Makassar":  [9, 10, 11, 12],             // Finishing
  "UD Listrik Andalan Sulsel":    [16, 17, 18],                // Elektrikal
  "CV Plumbing Prima Sulsel":     [13, 14, 15],                // Plumbing
  "CV Atap Kuda-Kuda Makassar":   [19, 20],                    // Atap
  "PT Landscape Hijau Indonesia": [3, 5],                       // Bahan dasar untuk landscape
};

// Efisiensi per subkon per project (nilai < 1 = efisien, > 1 = boros)
// Project 1 (Gowa), Project 2 (Maros)
const EFFICIENCY = {
  1: {
    "CV Bangunan Jaya Sulsel":      { factor: 1.07, unitsCompleted: 120 },
    "CV Mitra Finishing Makassar":  { factor: 0.97, unitsCompleted: 115 },
    "UD Listrik Andalan Sulsel":    { factor: 1.03, unitsCompleted: 125 },
    "CV Plumbing Prima Sulsel":     { factor: 1.11, unitsCompleted: 118 },
    "CV Atap Kuda-Kuda Makassar":   { factor: 1.01, unitsCompleted: 130 },
    "PT Landscape Hijau Indonesia": { factor: 0.94, unitsCompleted: 100 },
  },
  2: {
    "CV Bangunan Jaya Sulsel":      { factor: 1.14, unitsCompleted: 100 },
    "CV Mitra Finishing Makassar":  { factor: 1.05, unitsCompleted: 90  },
    "UD Listrik Andalan Sulsel":    { factor: 1.08, unitsCompleted: 105 },
    "CV Plumbing Prima Sulsel":     { factor: 1.04, unitsCompleted: 95  },
    "CV Atap Kuda-Kuda Makassar":   { factor: 1.06, unitsCompleted: 110 },
    "PT Landscape Hijau Indonesia": { factor: 1.02, unitsCompleted: 80  },
  },
};

async function main() {
  // Ambil data material master
  const { rows: masters } = await sql("SELECT id, name, standard_per_unit FROM prod_material_master WHERE standard_per_unit IS NOT NULL");
  const masterMap = {};
  for (const m of masters) masterMap[m.id] = m;

  // Hapus material_out lama untuk project 1 dan 2 (akan di-reseed)
  await sql("DELETE FROM prod_material_out WHERE project_id IN (1, 2)");
  console.log("Cleared old material_out for projects 1 & 2");

  const records = [];
  const baseDate = new Date("2025-10-01");

  for (const [projectId, subkonEfficiency] of Object.entries(EFFICIENCY)) {
    const pid = parseInt(projectId);

    for (const [subkonName, { factor, unitsCompleted }] of Object.entries(subkonEfficiency)) {
      const materialIds = SUBKON_MATERIALS[subkonName] ?? [];

      for (const materialId of materialIds) {
        const master = masterMap[materialId];
        if (!master) continue;

        const standardPerUnit = parseFloat(master.standard_per_unit);
        const totalActual = standardPerUnit * factor * unitsCompleted;

        // Bagi jadi 5-7 batch pengambilan material sepanjang waktu proyek
        const batchCount = Math.floor(5 + Math.random() * 3);
        let remaining = totalActual;

        for (let b = 0; b < batchCount; b++) {
          const isLast = b === batchCount - 1;
          const batchQty = isLast
            ? remaining
            : Math.round((totalActual / batchCount) * (0.8 + Math.random() * 0.4) * 10) / 10;
          remaining -= batchQty;

          // Tanggal batch: Oktober 2025 - Mei 2026
          const daysOffset = Math.floor((b / batchCount) * 210 + Math.random() * 15);
          const batchDate = new Date(baseDate);
          batchDate.setDate(batchDate.getDate() + daysOffset);
          const dateStr = batchDate.toISOString().split("T")[0];

          records.push({
            projectId: pid,
            stageCode: "STAGE_A",
            materialId,
            quantity: Math.max(0.1, Math.round(batchQty * 10) / 10),
            subkonName,
            dateOut: dateStr,
            takenBy: subkonName,
            notes: `Batch ${b + 1}/${batchCount}`,
          });
        }
      }
    }
  }

  // Insert semua records
  let inserted = 0;
  for (const r of records) {
    await sql(
      `INSERT INTO prod_material_out (project_id, stage_code, material_id, quantity, subkon_name, date_out, taken_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [r.projectId, r.stageCode, r.materialId, r.quantity, r.subkonName, r.dateOut, r.takenBy, r.notes]
    );
    inserted++;
  }

  console.log(`Inserted ${inserted} material_out records`);

  // Verifikasi
  const { rows: check } = await sql(`
    SELECT subkon_name, count(*) as batches, sum(quantity) as total_qty
    FROM prod_material_out
    WHERE project_id = 1
    GROUP BY subkon_name
    ORDER BY subkon_name
  `);
  console.log("\nVerifikasi Project 1:");
  for (const c of check) console.log(` - ${c.subkon_name}: ${c.batches} batch, total qty: ${parseFloat(c.total_qty).toFixed(1)}`);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
