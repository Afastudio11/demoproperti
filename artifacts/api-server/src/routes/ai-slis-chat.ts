import { Router, type IRouter } from "express";
import { createDeepSeekClient, DEEPSEEK_MODEL, APP_SYSTEM_PROMPT } from "../lib/deepseek";

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

  // ── Fase 1: Siapkan sumber data referensi ────────────────────────────────
  let webData = "";
  const sources: { title: string; url: string }[] = [];

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
    : `\n══ BASIS DATA YANG DIGUNAKAN ══\nGunakan pengetahuan training tentang Sulawesi Selatan secara mendalam: data BPS (bps.go.id), PUPR (pupr.go.id), PPDPP/BP Tapera (bptapera.go.id), Kementerian ATR/BPN (atrbpn.go.id), BI (bi.go.id), data FLPP dari PPDPP, RTRW Sulsel, dan laporan properti terkini.`;

  // Referensi sumber data resmi yang bisa dikutip AI
  const DATA_SOURCES = [
    { title: "BPS Sulawesi Selatan", url: "https://sulsel.bps.go.id" },
    { title: "BPS Indonesia — Data Perumahan", url: "https://www.bps.go.id/subject/29/perumahan.html" },
    { title: "PPDPP / BP Tapera — Data FLPP", url: "https://bptapera.go.id/realisasi-flpp" },
    { title: "Kementerian PUPR", url: "https://www.pu.go.id" },
    { title: "Kementerian ATR/BPN", url: "https://www.atrbpn.go.id" },
    { title: "Bank Indonesia — Statistik Properti Komersial", url: "https://www.bi.go.id/id/statistik/ekonomi-keuangan/sppr/Default.aspx" },
    { title: "KRIS Kemenkeu — Data Fiskal Daerah", url: "https://djpk.kemenkeu.go.id" },
    { title: "Disdukcapil Sulsel — Data Kependudukan", url: "https://disdukcapil.sulselprov.go.id" },
    { title: "BKPRD Sulsel — RTRW Sulawesi Selatan", url: "https://tataruang.sulselprov.go.id" },
    { title: "REI Sulawesi Selatan", url: "https://www.rei.or.id" },
  ];

  const prompt = `Kamu adalah SLIS AI — analis investasi properti senior Property Development, spesialis riset pasar Sulawesi Selatan.
Kamu memiliki pengetahuan mendalam tentang: ekonomi daerah Sulsel, proyek infrastruktur pemerintah, pasar perumahan FLPP & komersial, data BPS, tren urbanisasi, kawasan industri, dan kondisi lahan.

PERTANYAAN USER: "${question}"

══ DATA SLIS INTERNAL ══${slisKabText}

══ TOP 12 RANKING KABUPATEN SULSEL ══
${rankingText || "Tidak tersedia"}
${webSection}

══ RIWAYAT CHAT ══
${historyText || "Percakapan baru"}

══ DAFTAR SUMBER DATA RESMI (untuk dikutip di field sources) ══
${DATA_SOURCES.map((s, i) => `${i + 1}. ${s.title} — ${s.url}`).join("\n")}

══ INSTRUKSI ANALISIS ══
1. Berikan analisis KOMPREHENSIF berbasis SEMUA data di atas + pengetahuan mendalam tentang Sulsel
2. Sebutkan data SPESIFIK: angka, persentase, nama proyek, harga, perbandingan
3. Untuk visualisasi: pilih data numerik yang relevan (skor, harga per m², jumlah unit, pertumbuhan, dll)
4. Jika membandingkan kabupaten: tampilkan perbandingan skor di visualisasi
5. Jika membahas 1 kabupaten: tampilkan breakdown sub-skor atau harga tanah per kecamatan
6. Di field "sources": cantumkan 3-5 sumber data paling relevan dari daftar sumber di atas yang mendukung analisismu

Format output PERSIS JSON berikut (tanpa markdown, tanpa teks di luar JSON):
{
  "jawaban": "<analisis komprehensif MINIMAL 200 kata. Wajib sertakan: kondisi pasar saat ini, data ekonomi konkret, infrastruktur strategis, peluang investasi spesifik, risiko utama, dan rekomendasi action untuk Property Development>",
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
  "sources": [
    { "title": "<nama sumber, contoh: BPS Sulawesi Selatan>", "url": "<url sumber>" },
    { "title": "<nama sumber 2>", "url": "<url sumber 2>" }
  ],
  "pertanyaan_lanjutan": [
    "<pertanyaan follow-up spesifik dan relevan 1>",
    "<pertanyaan follow-up spesifik 2>",
    "<pertanyaan follow-up spesifik 3>"
  ]
}

WAJIB: field "sources" harus selalu berisi minimal 3 entri yang paling relevan dengan analisis.
CATATAN: "visualisasi" bisa null jika benar-benar tidak ada data yang cocok untuk divisualisasikan.`;

  try {
    const completion = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: APP_SYSTEM_PROMPT },
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
    // Pakai sources dari AI response; fallback ke array kosong jika tidak ada
    const aiSources = Array.isArray(result.sources) && result.sources.length > 0
      ? result.sources
      : sources;
    res.json({ ...result, sources: aiSources });
  } catch (err) {
    const apiErr = err as { message?: string; status?: number; error?: { message?: string } };
    const errDetail = apiErr?.error?.message || apiErr?.message || String(err);
    req.log.error({ err, errDetail }, "SLIS chat AI call failed");
    res.status(500).json({ error: `Gagal menghubungi layanan AI: ${errDetail}` });
  }
});

export default router;
