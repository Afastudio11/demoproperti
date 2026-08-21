import { Router, type IRouter } from "express";
import { createDeepSeekClient, DEEPSEEK_MODEL, APP_SYSTEM_PROMPT } from "../lib/deepseek";

const router: IRouter = Router();

router.post("/ai/kabupaten-insight", async (req, res) => {
  const { kabupaten, roadmapItem, prospects, slisScore } = req.body as {
    kabupaten: string;
    roadmapItem?: {
      tahun: number;
      kecamatan_prioritas: string[];
      alasan: string;
      target_unit: number;
      estimasi_investasi: string;
      estimasi_revenue?: string;
      risiko_utama?: string;
      strategi_masuk?: string;
    };
    prospects: {
      lokasi: string;
      luas: number;
      hargaM2: number;
      roi: number;
      status: string;
    }[];
    slisScore?: {
      score: number;
      grade: string;
      hargaTanahRange: string;
      kompetitorCount: number;
      potensiPasar: string;
    };
  };

  if (!kabupaten) {
    res.status(400).json({ error: "Parameter kabupaten wajib diisi" });
    return;
  }

  const deepseek = createDeepSeekClient();

  const prospectSection = prospects?.length
    ? `Prospek lahan aktif di ${kabupaten}:\n` +
      prospects
        .map(
          p =>
            `- ${p.lokasi}: ${(p.luas / 10000).toFixed(2)} Ha, Rp${p.hargaM2.toLocaleString("id-ID")}/m², ROI ${p.roi}%, Status: ${p.status}`,
        )
        .join("\n")
    : `Belum ada data prospek lahan aktif di ${kabupaten} dalam sistem.`;

  const slisSection = slisScore
    ? `Data SLIS: Skor ${slisScore.score} (${slisScore.grade}) | Harga tanah: ${slisScore.hargaTanahRange} | Jumlah kompetitor: ${slisScore.kompetitorCount} | ${slisScore.potensiPasar}`
    : "";

  const roadmapSection = roadmapItem
    ? `Rencana ekspansi roadmap: Tahun ${roadmapItem.tahun} | Target ${roadmapItem.target_unit} unit | Investasi ${roadmapItem.estimasi_investasi}${roadmapItem.estimasi_revenue ? ` | Revenue ${roadmapItem.estimasi_revenue}` : ""} | Kec. prioritas: ${roadmapItem.kecamatan_prioritas?.join(", ") ?? "-"}`
    : "";

  const prompt = `Kamu adalah SLIS AI, analis properti senior Property Development. Berikan analisis mendalam, aktual, dan berbasis fakta untuk ${kabupaten}, Sulawesi Selatan.

${slisSection ? `═══ SKOR SLIS ═══\n${slisSection}\n` : ""}${roadmapSection ? `\n═══ ROADMAP EKSPANSI ═══\n${roadmapSection}\n` : ""}
═══ DATA LAHAN EXISTING ═══
${prospectSection}

═══ INSTRUKSI ═══
Berikan analisis komprehensif dan aktual (berdasarkan pengetahuanmu tentang ${kabupaten}, Sulawesi Selatan) yang mencakup: perkembangan infrastruktur nyata, kebijakan daerah/nasional yang relevan, kondisi pasar properti, kawasan strategis, peluang konkret, dan risiko aktual yang perlu diwaspadai developer properti.

Format output PERSIS JSON berikut (tanpa markdown, tanpa teks di luar JSON):
{
  "situasi_terkini": "<2-3 kalimat kondisi terkini ${kabupaten} yang paling relevan untuk investasi properti — perkembangan ekonomi, industri, pertumbuhan penduduk, atau kebijakan strategis>",
  "perkembangan_infrastruktur": "<2-3 kalimat infrastruktur aktual atau yang sedang/akan dibangun: jalan nasional/tol, pelabuhan, bandara, kawasan industri, SPAM, listrik — yang mempengaruhi nilai properti>",
  "dinamika_pasar": "<2-3 kalimat tren harga tanah terkini, jenis perumahan yang paling diminati, perilaku kompetitor lokal, dan permintaan nyata dari segmen pembeli>",
  "peluang_spesifik": [
    "<peluang konkret 1 — sebutkan kecamatan/kawasan spesifik dan segmen target>",
    "<peluang konkret 2 — berbeda dari peluang 1>",
    "<peluang konkret 3>"
  ],
  "risiko_aktual": [
    "<risiko 1 yang paling relevan dan spesifik saat ini untuk developer di ${kabupaten}>",
    "<risiko 2>"
  ],
  "sinkronisasi_lahan": "<2-3 kalimat analisis: apakah prospek lahan yang sudah ada (jika ada) tepat posisi dan harga untuk rencana ekspansi? Apa gap yang perlu diisi? Jika tidak ada data lahan, apa yang perlu segera dicari?>",
  "rekomendasi_keputusan": [
    "<langkah konkret 1 yang harus dilakukan dalam 0-30 hari>",
    "<langkah konkret 2 dalam 30-90 hari>",
    "<langkah konkret 3 dalam 3-6 bulan>"
  ],
  "skor_urgensi": <angka integer 0-100: seberapa urgent Property Development harus masuk sekarang sebelum kehilangan momentum>,
  "alasan_urgensi": "<1 kalimat singkat mengapa skor urgensi tersebut>"
}`;

  try {
    const completion = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: APP_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 3000,
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
    const apiErr = err as {
      message?: string;
      status?: number;
      error?: { message?: string };
    };
    const errDetail =
      apiErr?.error?.message || apiErr?.message || String(err);
    req.log.error({ err, errDetail }, "AI kabupaten insight failed");
    res
      .status(500)
      .json({ error: `Gagal menghubungi layanan AI: ${errDetail}` });
  }
});

export default router;
