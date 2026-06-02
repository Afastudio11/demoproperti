import { Router, type IRouter } from "express";
import Groq from "groq-sdk";

const router: IRouter = Router();

router.post("/ai/analyze-land", async (req, res) => {
  const {
    lokasi, kelurahan, kecamatan, kabupaten,
    luas, hargaM2, roi, aksesJalan,
    elevMin, elevMax, elevAvg,
    slopeAvgPct, slopeMaxPct,
    waterwayType, waterwayName, waterwayDistM,
    checkedItems, currentStage,
    competitors,
  } = req.body;

  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "GROQ_API_KEY tidak dikonfigurasi" });
    return;
  }

  const groq = new Groq({ apiKey });

  // ── Terrain section ──────────────────────────────────────────────────────────
  const hasTerrainData = elevAvg != null;
  const terrainSection = hasTerrainData
    ? `\nData Kontur Lahan (dari SRTM NASA):
- Elevasi: min ${elevMin}m, rata-rata ${elevAvg}m, maks ${elevMax}m
- Kemiringan rata-rata: ${slopeAvgPct?.toFixed(1)}%, kemiringan maks: ${slopeMaxPct?.toFixed(1)}%
- Kategori kontur: ${slopeAvgPct < 2 ? "DATAR" : slopeAvgPct < 5 ? "LANDAI" : slopeAvgPct < 15 ? "MIRING" : "CURAM"}
- Sungai/saluran terdekat: ${waterwayDistM != null ? `${Math.round(waterwayDistM)}m` : "tidak diketahui"}${waterwayName ? ` (${waterwayType} ${waterwayName})` : ""}
- Risiko banjir: ${waterwayDistM == null ? "tidak diketahui" : waterwayDistM < 100 ? "TINGGI (< 100m dari sungai)" : waterwayDistM < 300 ? "SEDANG (100-300m)" : waterwayDistM < 500 ? "RENDAH-WASPADA (300-500m)" : "AMAN (> 500m)"}`
    : "";

  // ── Competitor section ───────────────────────────────────────────────────────
  const competitorList: string[] = Array.isArray(competitors) ? competitors : [];
  const competitorSection = competitorList.length > 0
    ? `\nIntelijen Kompetitor (radius 3km dari lahan, data OpenStreetMap):
- Jumlah perumahan/developer terdeteksi: ${competitorList.length}
- Nama perumahan: ${competitorList.join(", ")}
- Analisis: ${competitorList.length <= 2 ? "Kompetitor sedikit, potensi market lebih luas" : competitorList.length <= 5 ? "Kompetitor moderat, market sudah terbentuk" : "Kompetitor padat, persaingan tinggi namun membuktikan demand"}`
    : "\nIntelijen Kompetitor: Tidak ada data perumahan terdeteksi di radius 3km (OSM)";

  // ── Estimasi kapasitas ───────────────────────────────────────────────────────
  const luasNum = typeof luas === "number" ? luas : parseFloat(luas) || 0;
  const usableArea = luasNum * 0.6;
  const estimasiUnit = Math.floor(usableArea / 100);

  const prompt = `Kamu adalah SLIS (Satara Land Intelligence System), AI konsultan properti senior yang ahli di pasar properti Sulawesi Selatan.
Satara Development adalah developer yang sedang ekspansi multi-kabupaten. Berikan analisis kelayakan akuisisi lahan berikut secara komprehensif, tegas, dan profesional dalam Bahasa Indonesia.

═══ DATA LAHAN ═══
- Lokasi: ${lokasi}${[kelurahan, kecamatan, kabupaten].filter(Boolean).length ? ` (${[kelurahan, kecamatan, kabupaten].filter(Boolean).join(", ")})` : ""}
- Luas: ${luasNum?.toLocaleString("id-ID")} m² (${(luasNum / 10000).toFixed(2)} Ha)
- Harga tanah: Rp${hargaM2?.toLocaleString("id-ID")}/m² → Total: Rp${(luasNum * hargaM2)?.toLocaleString("id-ID")}
- Estimasi ROI input: ${roi}%
- Akses Jalan: ${aksesJalan ? `${aksesJalan} meter` : "belum diisi"}
- Estimasi kapasitas unit (60% efektif, 10×10m/unit): ±${estimasiUnit} unit
- Tahap saat ini: ${currentStage ?? "Prospek Baru"}
- Checklist selesai: ${checkedItems ?? 0} item${terrainSection}${competitorSection}

═══ STANDAR KELAYAKAN SATARA ═══
- ROI minimal: >25% (margin >20%)
- Akses jalan: min 5 meter
- Legalitas: clean & clear, bebas sengketa
- Kontur: datar atau landai lebih diutamakan (kemiringan <5%)
- Risiko banjir: jarak sungai >300m diutamakan
- Kompetitor: kehadiran kompetitor = bukti demand, tapi >8 = oversaturated
- Market potensial: tinggi

═══ INSTRUKSI ANALISIS ═══
Berikan analisis komprehensif dengan mempertimbangkan SEMUA data di atas:
1. Kontur lahan dari data SRTM NASA (kemiringan, elevasi, risiko banjir)
2. Harga tanah vs harga pasar umum di wilayah tersebut
3. Kehadiran kompetitor sebagai indikator demand pasar
4. Kalkulasi finansial: harga maksimum akuisisi, estimasi ROI realistis, payback period
5. Potensi pengembangan: estimasi unit, revenue, dan profitabilitas

Berikan output dalam format JSON PERSIS seperti ini (tanpa markdown, tanpa teks di luar JSON):
{
  "verdict": "LAYAK" | "PERLU KAJIAN" | "TIDAK LAYAK",
  "score": <angka 0-100>,
  "ringkasan": "<2-3 kalimat ringkasan keputusan yang jelas dan tegas>",
  "kelebihan": ["<poin 1>", "<poin 2>", "<poin 3>", "<poin 4 jika ada>"],
  "risiko": ["<risiko 1>", "<risiko 2>", "<risiko 3>", "<risiko 4 jika ada>"],
  "rekomendasi": "<2-3 kalimat saran tindak lanjut konkret dan actionable>",
  "potensiUnit": <estimasi jumlah unit integer atau null>,
  "hargaMaksAkuisisi": <harga maksimum akuisisi per m2 dalam rupiah integer atau null>,
  "roiEstimasi": <estimasi ROI realistis dalam persen integer atau null>,
  "paybackBulan": <estimasi payback period dalam bulan integer atau null>
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.25,
      max_tokens: 900,
    });

    const content = completion.choices[0]?.message?.content ?? "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(500).json({ error: "Format respons AI tidak valid" });
      return;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "AI analysis failed");
    res.status(500).json({ error: "Gagal menghubungi layanan AI" });
  }
});

export default router;
