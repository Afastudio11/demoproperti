import { Router, type IRouter } from "express";
import Groq from "groq-sdk";

const router: IRouter = Router();

router.post("/ai/analyze-land", async (req, res) => {
  const {
    lokasi, kelurahan, kecamatan, kabupaten,
    luas, hargaM2, roi, aksesJalan,
    bentukLahan, statusLegal, konturInput,
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

  const hasTerrainData = elevAvg != null;
  const autoKontur = hasTerrainData
    ? (slopeAvgPct < 2 ? "Datar" : slopeAvgPct < 5 ? "Landai" : slopeAvgPct < 15 ? "Miring" : "Curam")
    : konturInput ?? "Belum diketahui";

  const terrainSection = hasTerrainData
    ? `\nKontur Lahan (data SRTM NASA):
- Elevasi: min ${elevMin}m, rata-rata ${elevAvg}m, maks ${elevMax}m
- Kemiringan rata-rata: ${slopeAvgPct?.toFixed(1)}%, kemiringan maks: ${slopeMaxPct?.toFixed(1)}%
- Kategori kontur: ${autoKontur}
- Sungai/saluran terdekat: ${waterwayDistM != null ? `${Math.round(waterwayDistM)}m` : "tidak diketahui"}${waterwayName ? ` (${waterwayType} ${waterwayName})` : ""}
- Risiko banjir: ${waterwayDistM == null ? "tidak diketahui" : waterwayDistM < 100 ? "TINGGI (< 100m dari sungai)" : waterwayDistM < 300 ? "SEDANG (100-300m)" : waterwayDistM < 500 ? "RENDAH-WASPADA (300-500m)" : "AMAN (> 500m)"}`
    : `\nKontur: ${autoKontur}`;

  const competitorList: string[] = Array.isArray(competitors) ? competitors : [];
  const competitorSection = competitorList.length > 0
    ? `\nKompetitor (radius 3km, OSM):
- Jumlah terdeteksi: ${competitorList.length}
- Nama: ${competitorList.join(", ")}
- Analisis: ${competitorList.length <= 2 ? "Kompetitor sedikit, potensi market luas" : competitorList.length <= 5 ? "Kompetitor moderat, market sudah terbentuk" : "Kompetitor padat, demand terbukti tapi persaingan tinggi"}`
    : "\nKompetitor: Tidak ada data perumahan di radius 3km (OSM)";

  const luasNum = typeof luas === "number" ? luas : parseFloat(luas) || 0;
  const usableArea = luasNum * 0.6;
  const luasFasum = luasNum * 0.2;
  const luasJalan = luasNum * 0.2;
  const estimasiUnit = Math.floor(usableArea / 100);
  const hargaM2Num = typeof hargaM2 === "number" ? hargaM2 : parseFloat(hargaM2) || 0;
  const totalAkuisisi = luasNum * hargaM2Num;

  const prompt = `Kamu adalah SLIS (Satara Land Intelligence System), AI konsultan properti senior di pasar Sulawesi Selatan.

═══ DATA LAHAN ═══
- Lokasi: ${lokasi}${[kelurahan, kecamatan, kabupaten].filter(Boolean).length ? ` (${[kelurahan, kecamatan, kabupaten].filter(Boolean).join(", ")})` : ""}
- Luas: ${luasNum?.toLocaleString("id-ID")} m² (${(luasNum / 10000).toFixed(2)} Ha)
- Harga tanah: Rp${hargaM2Num?.toLocaleString("id-ID")}/m² → Total akuisisi: Rp${totalAkuisisi?.toLocaleString("id-ID")}
- Estimasi ROI input: ${roi}%
- Akses Jalan: ${aksesJalan ? `${aksesJalan} meter` : "belum diisi"}
- Bentuk Lahan: ${bentukLahan ?? "Belum diisi"}
- Status Legal: ${statusLegal ?? "Belum diisi"}
- Kapasitas unit (60% efektif kavling, 10×10m/unit): ±${estimasiUnit} unit
- Luas Fasum estimasi (20%): ${luasFasum?.toLocaleString("id-ID")} m²
- Luas Jalan estimasi (20%): ${luasJalan?.toLocaleString("id-ID")} m²
- Tahap saat ini: ${currentStage ?? "Prospek Baru"}
- Checklist selesai: ${checkedItems ?? 0} item${terrainSection}${competitorSection}

═══ STANDAR KELAYAKAN SATARA ═══
- ROI minimal: >25% (margin >20%)
- Akses jalan: min 5 meter
- Legalitas: clean & clear, bebas sengketa (SHM lebih diutamakan)
- Kontur: datar/landai diutamakan (kemiringan <5%)
- Risiko banjir: jarak sungai >300m
- Kompetitor: kehadiran = bukti demand, tapi >8 = oversaturated

═══ INSTRUKSI ANALISIS ═══
Analisis secara komprehensif dan berikan output JSON PERSIS (tanpa markdown, tanpa teks di luar JSON):
{
  "verdict": "Sangat Direkomendasikan" | "Direkomendasikan" | "Perlu Review" | "Tidak Direkomendasikan",
  "score": <angka 0-100>,
  "kategori": "<Sangat Direkomendasikan|Direkomendasikan|Perlu Review|Tidak Direkomendasikan>",
  "ringkasan": "<2-3 kalimat ringkasan keputusan yang jelas>",
  "kelebihan": ["<poin 1>", "<poin 2>", "<poin 3>"],
  "risiko": ["<risiko 1>", "<risiko 2>", "<risiko 3>"],
  "rekomendasi": "<2-3 kalimat saran tindak lanjut konkret>",
  "potensiUnit": <estimasi unit integer>,
  "hargaMaksAkuisisi": <harga maks akuisisi per m2 rupiah integer>,
  "roiEstimasi": <ROI realistis persen integer>,
  "paybackBulan": <payback period bulan integer>,
  "potensiRevenue": <estimasi total revenue rupiah integer atau null>,
  "estimasiHPP": <estimasi HPP total rupiah integer atau null>,
  "estimasiProfit": <estimasi profit rupiah integer atau null>,
  "irr": <Internal Rate of Return persen integer atau null>,
  "npv": <Net Present Value rupiah integer atau null>,
  "efektivitasKavling": <persen efektivitas kavling integer>,
  "luasFasum": <luas fasum m2 integer>,
  "luasJalan": <luas jalan m2 integer>,
  "tingkatRisiko": "Rendah" | "Sedang" | "Tinggi"
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.25,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(500).json({ error: "Format respons AI tidak valid" });
      return;
    }
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    req.log.error({ err }, "AI analysis failed");
    res.status(500).json({ error: "Gagal menghubungi layanan AI" });
  }
});

export default router;
