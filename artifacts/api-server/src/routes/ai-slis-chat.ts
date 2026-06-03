import { Router, type IRouter } from "express";
import { createDeepSeekClient, DEEPSEEK_MODEL, SATARA_SYSTEM_PROMPT } from "../lib/deepseek";

const router: IRouter = Router();

interface SlisKabContext {
  name: string;
  score: number;
  grade: string;
  populasi: string;
  hargaTanahRange: string;
  kompetitorCount: number;
  potensiPasar: string;
  infrastruktur: string[];
  pertumbuhanPct: number;
  pertumbuhanEkonomi: number;
  pdrbPerKapita: number;
  tingkatUrbanisasi: number;
  tingkatPengangguran: number;
  realisasiFLPP: number;
  kecamatanTeratas?: { name: string; score: number }[];
}

interface ChatHistoryItem {
  role: "user" | "assistant";
  content: string;
}

router.post("/ai/slis-chat", async (req, res) => {
  const {
    question,
    slisKab,
    slisRanking,
    history = [],
  } = req.body as {
    question: string;
    slisKab?: SlisKabContext;
    slisRanking?: { name: string; score: number; grade: string }[];
    history?: ChatHistoryItem[];
  };

  if (!question?.trim()) {
    res.status(400).json({ error: "Pertanyaan tidak boleh kosong" });
    return;
  }

  let deepseek;
  try {
    deepseek = createDeepSeekClient();
  } catch {
    res.status(503).json({ error: "DEEPSEEK_API_KEY belum dikonfigurasi. Tambahkan API key di Secrets Replit." });
    return;
  }

  // ── Fase 1: Web research (opsional, fallback graceful) ────────────────────
  let webData = "";
  const sources: { title: string; url: string }[] = [];

  // Web search tidak tersedia di Groq — skip fase 1

  // ── Fase 2: Analisis terstruktur ─────────────────────────────────────────
  const slisKabText = slisKab
    ? `
KABUPATEN: ${slisKab.name}
Skor SLIS: ${slisKab.score}/100 | Grade: ${slisKab.grade.replace(/_/g, " ").toUpperCase()}
Populasi: ${slisKab.populasi} | Pertumbuhan: ${slisKab.pertumbuhanPct}%/tahun
Harga Tanah: ${slisKab.hargaTanahRange}
Kompetitor Aktif: ${slisKab.kompetitorCount} developer
Potensi Pasar: ${slisKab.potensiPasar}
Infrastruktur: ${slisKab.infrastruktur.join(", ")}
Sub-skor: Pertumbuhan Ekonomi ${slisKab.pertumbuhanEkonomi}/100 | PDRB per Kapita ${slisKab.pdrbPerKapita}/100 | Urbanisasi ${slisKab.tingkatUrbanisasi}/100 | FLPP ${slisKab.realisasiFLPP}/100 | Pengangguran (inv) ${slisKab.tingkatPengangguran}/100
Kecamatan Terbaik: ${slisKab.kecamatanTeratas?.map((k) => `${k.name} (${k.score})`).join(", ") ?? "—"}`
    : "Tidak ada kabupaten spesifik yang terdeteksi dari pertanyaan.";

  const rankingText = (slisRanking ?? [])
    .slice(0, 12)
    .map((k, i) => `${i + 1}. ${k.name}: ${k.score} (${k.grade.replace(/_/g, " ")})`)
    .join("\n");

  const historyText = (history ?? [])
    .slice(-6)
    .map((m) => `${m.role === "user" ? "User" : "SLIS AI"}: ${m.content}`)
    .join("\n");

  const webSection = webData
    ? `\n══ DATA REAL-TIME (Web Research) ══\n${webData}`
    : `\n══ CATATAN ══\nWeb search tidak tersedia. Gunakan pengetahuan training AI tentang Sulawesi Selatan secara mendalam, termasuk data BPS, PUPR, DPRD, Kementerian ATR/BPN, dan berita properti.`;

  const prompt = `Kamu adalah SLIS AI — analis investasi properti senior Satara Development, spesialis riset pasar Sulawesi Selatan.
Kamu memiliki pengetahuan mendalam tentang: ekonomi daerah Sulsel, proyek infrastruktur pemerintah, pasar perumahan FLPP & komersial, data BPS, tren urbanisasi, kawasan industri, dan kondisi lahan.

PERTANYAAN USER: "${question}"

══ DATA SLIS INTERNAL ══${slisKabText}

══ TOP 12 RANKING KABUPATEN SULSEL ══
${rankingText || "Tidak tersedia"}
${webSection}

══ RIWAYAT CHAT ══
${historyText || "Percakapan baru"}

══ INSTRUKSI ANALISIS ══
1. Berikan analisis KOMPREHENSIF berbasis SEMUA data di atas + pengetahuan mendalam tentang Sulsel
2. Sebutkan data SPESIFIK: angka, persentase, nama proyek, harga, perbandingan
3. Untuk visualisasi: pilih data numerik yang relevan (skor, harga per m², jumlah unit, pertumbuhan, dll)
4. Jika membandingkan kabupaten: tampilkan perbandingan skor di visualisasi
5. Jika membahas 1 kabupaten: tampilkan breakdown sub-skor atau harga tanah per kecamatan

Format output PERSIS JSON berikut (tanpa markdown, tanpa teks di luar JSON):
{
  "jawaban": "<analisis komprehensif MINIMAL 200 kata. Wajib sertakan: kondisi pasar saat ini, data ekonomi konkret, infrastruktur strategis, peluang investasi spesifik, risiko utama, dan rekomendasi action untuk Satara Development>",
  "poin_penting": [
    "<insight kunci 1 dengan angka/data spesifik>",
    "<insight kunci 2 dengan angka/data spesifik>",
    "<insight kunci 3>",
    "<insight kunci 4>"
  ],
  "visualisasi": {
    "tipe": "bar_horizontal",
    "judul": "<judul deskriptif>",
    "satuan": "<satuan: Skor, Rp Ribu/m², %, Unit, dll>",
    "data": [
      { "label": "<nama singkat>", "nilai": <angka numerik>, "highlight": <true jika fokus utama> }
    ]
  },
  "pertanyaan_lanjutan": [
    "<pertanyaan follow-up spesifik dan relevan 1>",
    "<pertanyaan follow-up spesifik 2>",
    "<pertanyaan follow-up spesifik 3>"
  ]
}

CATATAN: "visualisasi" bisa null jika benar-benar tidak ada data yang cocok untuk divisualisasikan.`;

  try {
    const completion = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: SATARA_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.15,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      req.log.error({ content }, "SLIS chat AI response not valid JSON");
      res.status(500).json({ error: "Format respons AI tidak valid" });
      return;
    }

    const result = JSON.parse(jsonMatch[0]);
    res.json({ ...result, sources });
  } catch (err) {
    const apiErr = err as { message?: string; status?: number; error?: { message?: string } };
    const errDetail = apiErr?.error?.message || apiErr?.message || String(err);
    req.log.error({ err, errDetail }, "SLIS chat AI call failed");
    res.status(500).json({ error: `Gagal menghubungi layanan AI: ${errDetail}` });
  }
});

export default router;
