import { Router, type IRouter } from "express";
import Groq from "groq-sdk";

const router: IRouter = Router();

router.post("/ai/expansion-roadmap", async (req, res) => {
  const { kabupatenRanking, prospects, budget } = req.body as {
    kabupatenRanking: { name: string; score: number; grade: string; hargaTanahRange: string; kompetitorCount: number; potensiPasar: string }[];
    prospects: { lokasi: string; kabupaten?: string; luas: number; hargaM2: number; roi: number; status: string }[];
    budget?: string;
  };

  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "GROQ_API_KEY tidak dikonfigurasi" });
    return;
  }

  const groq = new Groq({ apiKey });

  const topKab = (kabupatenRanking ?? []).slice(0, 10).map(k =>
    `${k.name}: Skor ${k.score} (${k.grade}) | Harga: ${k.hargaTanahRange} | Kompetitor: ${k.kompetitorCount} | ${k.potensiPasar}`
  ).join("\n");

  const prospectSummary = (prospects ?? []).slice(0, 15).map(p =>
    `- ${p.lokasi}${p.kabupaten ? ` (${p.kabupaten})` : ""}: ${(p.luas / 10000).toFixed(2)} Ha, Rp${p.hargaM2.toLocaleString("id-ID")}/m², ROI ${p.roi}%, Status: ${p.status}`
  ).join("\n");

  const prompt = `Kamu adalah SLIS AI (Satara Land Intelligence System), konsultan ekspansi properti senior untuk Satara Development di Sulawesi Selatan.

Satara Development adalah developer perumahan subsidi & komersial yang sedang ekspansi multi-kabupaten. Mereka butuh roadmap ekspansi berbasis data untuk 5 tahun ke depan.

═══ DATA SCORING KABUPATEN (Top 10) ═══
${topKab}

═══ LAND BANK & PIPELINE AKTIF ═══
${prospectSummary || "Belum ada data land bank/pipeline."}

═══ MODAL TERSEDIA ═══
${budget || "Belum dispesifikasikan (asumsikan Rp10-50 Miliar)"}

═══ INSTRUKSI ═══
Berikan Roadmap Ekspansi Satara yang komprehensif berdasarkan data scoring di atas.
Format output PERSIS JSON berikut (tanpa markdown, tanpa teks luar JSON):
{
  "ringkasan_strategi": "<2-3 kalimat strategi ekspansi keseluruhan>",
  "roadmap": [
    {
      "tahun": 2026,
      "kabupaten": "<nama kabupaten>",
      "kecamatan_prioritas": ["<kec1>", "<kec2>"],
      "alasan": "<2 kalimat alasan pemilihan>",
      "target_unit": <angka integer>,
      "estimasi_investasi": "<misal Rp5-10 Miliar>",
      "risiko_utama": "<1 risiko utama>"
    }
  ],
  "kabupaten_prioritas": [
    { "rank": 1, "name": "<nama>", "alasan_singkat": "<1 kalimat>" }
  ],
  "rekomendasi_segera": "<2-3 kalimat tindakan yang harus dilakukan sekarang>",
  "peringatan": "<1-2 hal yang perlu diwaspadai dalam ekspansi>"
}

Roadmap harus mencakup 5 tahun (2026-2030). Kabupaten prioritas isi 5 terbaik.`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1200,
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(500).json({ error: "Format respons AI tidak valid" });
      return;
    }
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    req.log.error({ err }, "AI roadmap failed");
    res.status(500).json({ error: "Gagal menghubungi layanan AI" });
  }
});

export default router;
