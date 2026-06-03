import { Router, type IRouter } from "express";
import { createDeepSeekClient, DEEPSEEK_MODEL, SATARA_SYSTEM_PROMPT } from "../lib/deepseek";

const router: IRouter = Router();

router.post("/ai/expansion-roadmap", async (req, res) => {
  const { kabupatenRanking, prospects, budget } = req.body as {
    kabupatenRanking: { name: string; score: number; grade: string; hargaTanahRange: string; kompetitorCount: number; potensiPasar: string; kecamatanTeratas?: string[] }[];
    prospects: { lokasi: string; kabupaten?: string; luas: number; hargaM2: number; roi: number; status: string }[];
    budget?: string;
  };

  const deepseek = createDeepSeekClient();

  const topKab = (kabupatenRanking ?? []).slice(0, 15).map(k =>
    `${k.name}: Skor ${k.score} (${k.grade}) | Harga: ${k.hargaTanahRange} | Kompetitor: ${k.kompetitorCount} | ${k.potensiPasar}${k.kecamatanTeratas?.length ? " | Kec. Terbaik: " + k.kecamatanTeratas.join(", ") : ""}`
  ).join("\n");

  const prospectSummary = (prospects ?? []).slice(0, 20).map(p =>
    `- ${p.lokasi}${p.kabupaten ? ` (${p.kabupaten})` : ""}: ${(p.luas / 10000).toFixed(2)} Ha, Rp${p.hargaM2.toLocaleString("id-ID")}/m², ROI ${p.roi}%, Status: ${p.status}`
  ).join("\n");

  const prompt = `Kamu adalah SLIS AI (Satara Land Intelligence System), konsultan ekspansi properti senior untuk Satara Development di Sulawesi Selatan.

Satara Development adalah developer perumahan subsidi & komersial yang sedang ekspansi multi-kabupaten di Sulawesi Selatan. Mereka membutuhkan analisis komprehensif dan roadmap ekspansi berbasis data scoring SLIS untuk 5 tahun ke depan.

═══ DATA SCORING KABUPATEN (Top 15 dari 24) ═══
${topKab}

═══ LAND BANK & PIPELINE AKTIF ═══
${prospectSummary || "Belum ada data land bank/pipeline."}

═══ MODAL TERSEDIA ═══
${budget || "Belum dispesifikasikan (asumsikan Rp10-50 Miliar tahap awal)"}

═══ INSTRUKSI ═══
Berikan analisis SLIS yang SANGAT KOMPREHENSIF dan DETAIL. Setiap section harus diisi dengan analisis mendalam berbasis data scoring di atas.
Format output PERSIS JSON berikut (tanpa markdown, tanpa teks luar JSON):
{
  "ringkasan_strategi": "<3-4 kalimat ringkasan strategi ekspansi keseluruhan Satara Development>",
  "analisis_pasar": "<3-4 kalimat analisis kondisi pasar properti di Sulsel saat ini dan tren ke depan>",
  "analisis_kompetitor": "<2-3 kalimat positioning Satara vs kompetitor, peluang di pasar yang belum terisi>",
  "roadmap": [
    {
      "tahun": 2026,
      "kabupaten": "<nama kabupaten>",
      "kecamatan_prioritas": ["<kec1>", "<kec2>", "<kec3>"],
      "alasan": "<2-3 kalimat alasan strategis pemilihan kabupaten ini di tahun ini>",
      "target_unit": <angka integer realistis>,
      "estimasi_investasi": "<misal Rp5-10 Miliar>",
      "estimasi_revenue": "<misal Rp8-15 Miliar>",
      "risiko_utama": "<1 risiko utama spesifik>",
      "mitigasi_risiko": "<1 langkah mitigasi spesifik>",
      "strategi_masuk": "<1-2 kalimat cara masuk ke pasar kabupaten ini>"
    }
  ],
  "kabupaten_prioritas": [
    {
      "rank": 1,
      "name": "<nama>",
      "skor": <angka>,
      "alasan": "<2 kalimat alasan spesifik mengapa prioritas ini>",
      "kecamatan_terbaik": "<nama kecamatan terbaik>",
      "harga_tanah_range": "<range harga>",
      "estimasi_unit_potensi": <angka total unit potensi>,
      "timeline_masuk": "<misal Q1 2026>"
    }
  ],
  "rekomendasi_segera": [
    "<aksi konkret 1 yang harus dilakukan dalam 30 hari>",
    "<aksi konkret 2 yang harus dilakukan dalam 60 hari>",
    "<aksi konkret 3 yang harus dilakukan dalam 90 hari>"
  ],
  "peringatan": [
    "<peringatan risiko spesifik 1>",
    "<peringatan risiko spesifik 2>"
  ],
  "strategi_finansial": "<3-4 kalimat strategi alokasi modal, skema pembiayaan, dan target ROI untuk ekspansi>",
  "milestone_kunci": [
    { "periode": "Q1 2026", "target": "<milestone konkret>" },
    { "periode": "Q2 2026", "target": "<milestone konkret>" },
    { "periode": "Q3 2026", "target": "<milestone konkret>" },
    { "periode": "Q4 2026", "target": "<milestone konkret>" },
    { "periode": "2027", "target": "<milestone konkret>" },
    { "periode": "2028-2030", "target": "<milestone konkret>" }
  ]
}

Roadmap harus mencakup 5 tahun (2026-2030), 1 kabupaten per tahun. Kabupaten prioritas isi 5 terbaik dengan detail lengkap.
Semua analisis harus SPESIFIK dan BERBASIS DATA scoring yang diberikan, bukan generik.`;

  try {
    const completion = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: SATARA_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.15,
      max_tokens: 6000,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(500).json({ error: "Format respons AI tidak valid" });
      return;
    }
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    const apiErr = err as { message?: string; status?: number; error?: { message?: string } };
    const errDetail = apiErr?.error?.message || apiErr?.message || String(err);
    req.log.error({ err, errDetail }, "AI roadmap failed");
    res.status(500).json({ error: `Gagal menghubungi layanan AI: ${errDetail}` });
  }
});

export default router;
