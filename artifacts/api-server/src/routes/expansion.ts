import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { expansionTargetsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createDeepSeekClient, DEEPSEEK_MODEL, APP_SYSTEM_PROMPT } from "../lib/deepseek";

const router: IRouter = Router();

const SEED_DATA = [
  { kabupaten: "Makassar", hargaPinggirMin: 500000, hargaPinggirMax: 1500000, hargaPusatMin: 1500000, hargaPusatMax: 15000000, catatan: "Termahal di Sulsel", flppSuitable: 0, tier: "tier3", heuristicScore: 48 },
  { kabupaten: "Gowa", hargaPinggirMin: 200000, hargaPinggirMax: 300000, hargaPusatMin: 500000, hargaPusatMax: 2000000, catatan: "Pattallassang berkembang pesat", flppSuitable: 1, tier: "tier1", heuristicScore: 82 },
  { kabupaten: "Maros", hargaPinggirMin: 250000, hargaPinggirMax: 400000, hargaPusatMin: 700000, hargaPusatMax: 1500000, catatan: "Dekat Makassar & Bandara", flppSuitable: 1, tier: "tier1", heuristicScore: 78 },
  { kabupaten: "Takalar", hargaPinggirMin: 150000, hargaPinggirMax: 300000, hargaPusatMin: 400000, hargaPusatMax: 1000000, catatan: "Potensi suburban Makassar", flppSuitable: 1, tier: "tier1", heuristicScore: 79 },
  { kabupaten: "Barru", hargaPinggirMin: 80000, hargaPinggirMax: 150000, hargaPusatMin: 150000, hargaPusatMax: 500000, catatan: "Menarik untuk FLPP", flppSuitable: 1, tier: "tier1", heuristicScore: 86 },
  { kabupaten: "Parepare", hargaPinggirMin: 200000, hargaPinggirMax: 700000, hargaPusatMin: 500000, hargaPusatMax: 3000000, catatan: "Kota jasa & perdagangan", flppSuitable: 0, tier: "tier2", heuristicScore: 59 },
  { kabupaten: "Pinrang", hargaPinggirMin: 50000, hargaPinggirMax: 250000, hargaPusatMin: 200000, hargaPusatMax: 800000, catatan: "Agribisnis kuat", flppSuitable: 1, tier: "tier1", heuristicScore: 81 },
  { kabupaten: "Sidrap", hargaPinggirMin: 50000, hargaPinggirMax: 250000, hargaPusatMin: 200000, hargaPusatMax: 800000, catatan: "Pusat ekonomi tengah", flppSuitable: 1, tier: "tier1", heuristicScore: 78 },
  { kabupaten: "Enrekang", hargaPinggirMin: 50000, hargaPinggirMax: 150000, hargaPusatMin: 150000, hargaPusatMax: 500000, catatan: "Topografi pegunungan", flppSuitable: 1, tier: "tier2", heuristicScore: 63 },
  { kabupaten: "Soppeng", hargaPinggirMin: 50000, hargaPinggirMax: 150000, hargaPusatMin: 150000, hargaPusatMax: 600000, catatan: "Stabil", flppSuitable: 1, tier: "tier1", heuristicScore: 74 },
  { kabupaten: "Wajo", hargaPinggirMin: 50000, hargaPinggirMax: 200000, hargaPusatMin: 150000, hargaPusatMax: 700000, catatan: "Sengkang relatif tinggi", flppSuitable: 1, tier: "tier1", heuristicScore: 80 },
  { kabupaten: "Bone", hargaPinggirMin: 50000, hargaPinggirMax: 250000, hargaPusatMin: 250000, hargaPusatMax: 1000000, catatan: "Watampone cukup mahal", flppSuitable: 1, tier: "tier1", heuristicScore: 82 },
  { kabupaten: "Sinjai", hargaPinggirMin: 50000, hargaPinggirMax: 200000, hargaPusatMin: 200000, hargaPusatMax: 700000, catatan: "Pasar sedang tumbuh", flppSuitable: 1, tier: "tier1", heuristicScore: 84 },
  { kabupaten: "Bulukumba", hargaPinggirMin: 100000, hargaPinggirMax: 300000, hargaPusatMin: 300000, hargaPusatMax: 1000000, catatan: "Bira premium", flppSuitable: 1, tier: "tier1", heuristicScore: 76 },
  { kabupaten: "Bantaeng", hargaPinggirMin: 60000, hargaPinggirMax: 200000, hargaPusatMin: 250000, hargaPusatMax: 1000000, catatan: "Cocok FLPP", flppSuitable: 1, tier: "tier1", heuristicScore: 85 },
  { kabupaten: "Jeneponto", hargaPinggirMin: 50000, hargaPinggirMax: 200000, hargaPusatMin: 200000, hargaPusatMax: 700000, catatan: "Murah dan luas", flppSuitable: 1, tier: "tier1", heuristicScore: 83 },
  { kabupaten: "Kep. Selayar", hargaPinggirMin: 50000, hargaPinggirMax: 150000, hargaPusatMin: 150000, hargaPusatMax: 500000, catatan: "Wisata berkembang", flppSuitable: 1, tier: "tier2", heuristicScore: 58 },
  { kabupaten: "Pangkep", hargaPinggirMin: 100000, hargaPinggirMax: 300000, hargaPusatMin: 200000, hargaPusatMax: 700000, catatan: "Dekat Makassar", flppSuitable: 1, tier: "tier1", heuristicScore: 80 },
  { kabupaten: "Luwu", hargaPinggirMin: 100000, hargaPinggirMax: 300000, hargaPusatMin: 200000, hargaPusatMax: 700000, catatan: "Koridor Trans Sulawesi", flppSuitable: 1, tier: "tier1", heuristicScore: 75 },
  { kabupaten: "Palopo", hargaPinggirMin: 300000, hargaPinggirMax: 700000, hargaPusatMin: 700000, hargaPusatMax: 2000000, catatan: "Kota terbesar Luwu Raya", flppSuitable: 0, tier: "tier2", heuristicScore: 57 },
  { kabupaten: "Luwu Utara", hargaPinggirMin: 50000, hargaPinggirMax: 250000, hargaPusatMin: 150000, hargaPusatMax: 500000, catatan: "Potensi perkebunan", flppSuitable: 1, tier: "tier1", heuristicScore: 73 },
  { kabupaten: "Luwu Timur", hargaPinggirMin: 100000, hargaPinggirMax: 400000, hargaPusatMin: 300000, hargaPusatMax: 1000000, catatan: "Didorong sektor tambang", flppSuitable: 1, tier: "tier2", heuristicScore: 70 },
  { kabupaten: "Tana Toraja", hargaPinggirMin: 100000, hargaPinggirMax: 300000, hargaPusatMin: 300000, hargaPusatMax: 700000, catatan: "Wisata budaya", flppSuitable: 1, tier: "tier2", heuristicScore: 62 },
  { kabupaten: "Toraja Utara", hargaPinggirMin: 150000, hargaPinggirMax: 400000, hargaPusatMin: 400000, hargaPusatMax: 1000000, catatan: "Akses wisata & perkebunan", flppSuitable: 1, tier: "tier2", heuristicScore: 61 },
];

router.post("/expansion/seed", async (req, res) => {
  try {
    const existing = await db.select({ kabupaten: expansionTargetsTable.kabupaten }).from(expansionTargetsTable);
    if (existing.length > 0) {
      return res.json({ message: "Data sudah ada", count: existing.length });
    }
    await db.insert(expansionTargetsTable).values(SEED_DATA);
    res.json({ message: "Seed berhasil", count: SEED_DATA.length });
  } catch (err) {
    req.log.error({ err }, "Failed to seed expansion targets");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/expansion", async (req, res) => {
  try {
    const rows = await db.select().from(expansionTargetsTable).orderBy(expansionTargetsTable.heuristicScore);
    if (rows.length === 0) {
      await db.insert(expansionTargetsTable).values(SEED_DATA);
      const seeded = await db.select().from(expansionTargetsTable).orderBy(expansionTargetsTable.heuristicScore);
      return res.json(seeded.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(), lastAiAnalysis: r.lastAiAnalysis?.toISOString() ?? null })));
    }
    res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(), lastAiAnalysis: r.lastAiAnalysis?.toISOString() ?? null })));
  } catch (err) {
    req.log.error({ err }, "Failed to list expansion targets");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/expansion/:id/analyze", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.select().from(expansionTargetsTable).where(eq(expansionTargetsTable.id, id));
    if (!row) return res.status(404).json({ error: "Not found" });

    const deepseek = createDeepSeekClient();

    const fmtHarga = (n: number | null | undefined) => n ? `Rp ${(n / 1000).toFixed(0)} rb/m²` : "-";
    const flppNote = row.flppSuitable
      ? `Harga pinggir kota (${fmtHarga(row.hargaPinggirMin)}–${fmtHarga(row.hargaPinggirMax)}) MEMUNGKINKAN margin FLPP (target HPP <Rp166jt, kavling 60–72m²)`
      : `Harga terlalu tinggi untuk FLPP standar`;

    const prompt = `Kamu adalah analis ekspansi senior Property Development. Analisis potensi ekspansi ke ${row.kabupaten}, Sulawesi Selatan untuk developer perumahan subsidi/FLPP dan komersial skala menengah.

DATA REFERENSI ${row.kabupaten.toUpperCase()}:
- Harga lahan pinggir kota: ${fmtHarga(row.hargaPinggirMin)} – ${fmtHarga(row.hargaPinggirMax)}
- Harga lahan pusat kota: ${fmtHarga(row.hargaPusatMin)} – ${fmtHarga(row.hargaPusatMax)}
- Karakteristik pasar: ${row.catatan ?? ""}
- Kelayakan FLPP: ${flppNote}
- Skor heuristik awal (affordability+growth+strategic): ${row.heuristicScore}/100

KRITERIA Property Development:
- Target ROI minimal 35%, margin gross minimal 25%
- Produk utama: perumahan subsidi FLPP type 36/45, kavling 60–72 m²
- Target segmen: MBR & MBM di kota/kabupaten dengan pertumbuhan ekonomi jelas
- Kemampuan modal: bisa masuk proyek 2–5 Ha dengan lahan <Rp5M/kavling

DEFINISI TIER (WAJIB diikuti — JANGAN tentukan tier di luar kriteria ini):
- tier1 (Prioritas): expansionScore ≥ 73 DAN harga lahan pinggir memungkinkan HPP <Rp166jt untuk FLPP. Kabupaten yang sudah siap masuk pipeline akuisisi aktif.
- tier2 (Pipeline): expansionScore 50–72, ATAU FLPP layak tapi pertumbuhan ekonomi/daya serap pasar masih tanda tanya. Perlu riset lebih lanjut sebelum komit.
- tier3 (Watchlist): expansionScore <50, ATAU harga lahan terlalu tinggi untuk FLPP manapun, ATAU risiko fundamental terlalu besar.
PENTING: Skor heuristik awal sudah mempertimbangkan affordability dan strategi lokasi. Gunakan sebagai anchor — koreksi maksimal ±10 poin kecuali ada faktor kritis yang jelas terlewat.

Berikan analisis ekspansi komprehensif. Format output PERSIS JSON berikut (tanpa markdown, tanpa teks di luar JSON):
{
  "expansionScore": <integer 0-100, final score setelah AI analisis>,
  "tier": "<tier1|tier2|tier3 — WAJIB sesuai definisi di atas>",
  "ringkasan": "<2-3 kalimat ringkasan posisi ${row.kabupaten} untuk Property>",
  "keunggulan": ["<keunggulan 1>", "<keunggulan 2>", "<keunggulan 3>"],
  "risiko": ["<risiko 1>", "<risiko 2>"],
  "kecamatanPrioritas": ["<kecamatan 1 yang paling potensial>", "<kecamatan 2>"],
  "hargaTargetAcquisition": "<range harga lahan yang ideal untuk akuisisi di ${row.kabupaten} (Rp/m²)>",
  "rekomendasiLangkah": ["<langkah 0-30 hari>", "<langkah 30-90 hari>", "<langkah 3-6 bulan>"],
  "segmenProduk": "<perumahan subsidi FLPP | komersial menengah | campuran — mana yang paling cocok>",
  "kompetitorUtama": "<sebutkan 1-2 developer yang sudah aktif atau berpotensi aktif di ${row.kabupaten}>",
  "alasanTier": "<1 kalimat mengapa masuk tier ini>"
}`;

    const completion = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: APP_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.15,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "Format respons AI tidak valid" });
    }
    const aiData = JSON.parse(jsonMatch[0]) as {
      expansionScore?: number;
      tier?: string;
      ringkasan?: string;
      keunggulan?: string[];
      risiko?: string[];
      rekomendasiLangkah?: string[];
    };

    const updated = await db.update(expansionTargetsTable).set({
      aiScore: aiData.expansionScore ?? row.heuristicScore,
      tier: aiData.tier ?? row.tier,
      aiRationale: aiData.ringkasan ?? null,
      aiKeunggulan: JSON.stringify(aiData.keunggulan ?? []),
      aiRisiko: JSON.stringify(aiData.risiko ?? []),
      aiRekomendasiLangkah: JSON.stringify(aiData.rekomendasiLangkah ?? []),
      lastAiAnalysis: new Date(),
    }).where(eq(expansionTargetsTable.id, id)).returning();

    res.json({ ...updated[0], aiDetail: aiData, lastAiAnalysis: updated[0].lastAiAnalysis?.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to analyze expansion target");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
