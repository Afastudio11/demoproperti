import { Router, type IRouter } from "express";
import Groq from "groq-sdk";

const router: IRouter = Router();

interface POIResult {
  sekolah: string[];
  kesehatan: string[];
  belanja: string[];
  ibadah: string[];
  kawasanType: string;
  total: number;
}

async function fetchNearbyPOI(lat: number, lng: number): Promise<POIResult | null> {
  const query = `[out:json][timeout:12];
(
  node["amenity"~"school|kindergarten|university|college"](around:2500,${lat},${lng});
  node["amenity"~"hospital|clinic|pharmacy|health_post"](around:2500,${lat},${lng});
  node["amenity"~"marketplace|bank|fuel"](around:2000,${lat},${lng});
  node["amenity"~"supermarket"](around:2000,${lat},${lng});
  node["shop"~"supermarket|mall|convenience|minimarket|department_store"](around:2000,${lat},${lng});
  node["amenity"="place_of_worship"](around:1000,${lat},${lng});
  way["landuse"~"residential|commercial|industrial|farmland|forest|meadow|orchard"](around:600,${lat},${lng});
  way["highway"~"primary|secondary|trunk"](around:500,${lat},${lng});
);
out body 60;`;

  try {
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(13000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { elements: Array<{ type: string; tags?: Record<string, string> }> };

    const sekolah: string[] = [];
    const kesehatan: string[] = [];
    const belanja: string[] = [];
    const ibadah: string[] = [];
    const landuse: string[] = [];
    const highways: string[] = [];

    for (const el of data.elements ?? []) {
      const tags = el.tags ?? {};
      const name = tags.name ?? "";
      const amenity = tags.amenity ?? "";
      const shop = tags.shop ?? "";
      const lu = tags.landuse ?? "";
      const hw = tags.highway ?? "";

      if (lu) { landuse.push(lu); continue; }
      if (hw) { highways.push(hw); continue; }

      if (/school|kindergarten|university|college/.test(amenity)) {
        sekolah.push(name || amenity);
      } else if (/hospital|clinic|pharmacy|health/.test(amenity)) {
        kesehatan.push(name || amenity);
      } else if (/marketplace|supermarket|bank|fuel/.test(amenity) || /supermarket|mall|convenience|minimarket|department/.test(shop)) {
        belanja.push(name || amenity || shop);
      } else if (amenity === "place_of_worship") {
        ibadah.push(name || "tempat ibadah");
      }
    }

    // Determine kawasan type from landuse + POI
    const luCounts: Record<string, number> = {};
    for (const lu of landuse) luCounts[lu] = (luCounts[lu] ?? 0) + 1;
    const dominant = Object.entries(luCounts).sort(([, a], [, b]) => b - a)[0]?.[0];
    const hasMainRoad = highways.length > 0;
    const kawasanType = dominant === "residential" ? "Kawasan Perumahan"
      : dominant === "commercial" ? "Kawasan Komersial"
      : dominant === "industrial" ? "Kawasan Industri"
      : dominant === "farmland" || dominant === "orchard" ? "Kawasan Pertanian / Persawahan"
      : dominant === "forest" || dominant === "meadow" ? "Kawasan Pinggiran / Hijau"
      : (sekolah.length + kesehatan.length) >= 4 ? "Kawasan Campuran (berfasilitas)"
      : belanja.length >= 3 ? "Kawasan Semi-Komersial"
      : hasMainRoad ? "Koridor Jalan Utama"
      : "Kawasan Campuran";

    return {
      sekolah: [...new Set(sekolah)].slice(0, 8),
      kesehatan: [...new Set(kesehatan)].slice(0, 6),
      belanja: [...new Set(belanja)].slice(0, 8),
      ibadah: [...new Set(ibadah)].slice(0, 5),
      kawasanType,
      total: sekolah.length + kesehatan.length + belanja.length + ibadah.length,
    };
  } catch {
    return null;
  }
}

async function fetchTerrainSimple(lat: number, lng: number): Promise<{ elevAvg: number; slopePct: number; topografiAuto: string } | null> {
  const d = 0.004;
  const pts = [
    { latitude: lat, longitude: lng },
    { latitude: lat + d, longitude: lng },
    { latitude: lat - d, longitude: lng },
    { latitude: lat, longitude: lng + d },
    { latitude: lat, longitude: lng - d },
  ];
  try {
    const res = await fetch("https://api.open-elevation.com/api/v1/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locations: pts }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { results?: Array<{ elevation: number }> };
    const elevs = data.results?.map((r) => r.elevation) ?? [];
    if (elevs.length < 5) return null;
    const centerElev = elevs[0];
    const maxDiff = Math.max(...elevs.slice(1).map((e) => Math.abs(e - centerElev)));
    const slopePct = (maxDiff / 440) * 100;
    const topografiAuto = slopePct < 2 ? "Datar"
      : slopePct < 5 ? "Landai"
      : slopePct < 15 ? "Berbukit"
      : "Curam";
    return { elevAvg: centerElev, slopePct, topografiAuto };
  } catch {
    return null;
  }
}

router.post("/ai/analyze-land", async (req, res) => {
  const {
    lokasi, kelurahan, kecamatan, kabupaten,
    luas, hargaM2, roi, aksesJalan,
    bentukLahan, statusLegal, konturInput,
    topografi: topografiInput,
    kondisiJalan, utilitas, peilBanjir, namaPemilik, catatanLapangan,
    elevMin, elevMax, elevAvg,
    slopeAvgPct, slopeMaxPct,
    waterwayType, waterwayName, waterwayDistM,
    checkedItems, currentStage,
    competitors,
    lat, lng,
  } = req.body;

  const groq = new Groq({
    apiKey: process.env["GROQ_API_KEY"],
  });

  // Fetch POI and terrain in parallel if coordinates available
  const hasCoords = typeof lat === "number" && typeof lng === "number";
  const hasTerrainFromRequest = elevAvg != null;

  const [poiData, terrainAuto] = await Promise.all([
    hasCoords ? fetchNearbyPOI(lat, lng).catch(() => null) : Promise.resolve(null),
    (hasCoords && !hasTerrainFromRequest) ? fetchTerrainSimple(lat, lng).catch(() => null) : Promise.resolve(null),
  ]);

  // Merge terrain data
  const effectiveSlopePct = slopeAvgPct ?? terrainAuto?.slopePct;
  const effectiveElevAvg = elevAvg ?? terrainAuto?.elevAvg;
  const hasTerrainData = effectiveElevAvg != null;

  const autoKontur = hasTerrainData
    ? (effectiveSlopePct != null
      ? (effectiveSlopePct < 2 ? "Datar" : effectiveSlopePct < 5 ? "Landai" : effectiveSlopePct < 15 ? "Berbukit" : "Curam")
      : topografiInput ?? konturInput ?? "Datar (estimasi)")
    : topografiInput ?? konturInput ?? "Belum diketahui";

  const terrainSource = hasTerrainData
    ? (elevAvg != null ? "SRTM NASA" : "estimasi Open-Elevation")
    : "belum tersedia";

  const terrainSection = hasTerrainData
    ? `\nKontur & Elevasi (${terrainSource}):
- Elevasi: ${effectiveElevAvg?.toFixed(0) ?? "?"}m dpl${elevMin != null ? `, min ${elevMin}m, maks ${elevMax}m` : ""}
- Kemiringan rata-rata: ${effectiveSlopePct?.toFixed(1) ?? "?"}%${slopeMaxPct != null ? `, kemiringan maks: ${slopeMaxPct?.toFixed(1)}%` : ""}
- Kategori topografi: ${autoKontur}
- Sungai/saluran terdekat: ${waterwayDistM != null ? `${Math.round(waterwayDistM)}m${waterwayName ? ` (${waterwayType ?? "sungai"} ${waterwayName})` : ""}` : "tidak diketahui"}
- Risiko banjir (dari sungai): ${waterwayDistM == null ? "tidak diketahui" : waterwayDistM < 100 ? "TINGGI (< 100m dari sungai)" : waterwayDistM < 300 ? "SEDANG (100-300m)" : waterwayDistM < 500 ? "RENDAH-WASPADA (300-500m)" : "AMAN (> 500m)"}`
    : `\nTopografi: ${autoKontur} (belum ada data elevasi)`;

  // POI / Kawasan section
  let poiSection = "";
  if (poiData) {
    const items: string[] = [];
    if (poiData.kawasanType) items.push(`Tipe kawasan: ${poiData.kawasanType}`);
    if (poiData.sekolah.length > 0) items.push(`Sekolah/Kampus (${poiData.sekolah.length}): ${poiData.sekolah.slice(0, 4).join(", ")}`);
    if (poiData.kesehatan.length > 0) items.push(`Fasilitas kesehatan (${poiData.kesehatan.length}): ${poiData.kesehatan.slice(0, 3).join(", ")}`);
    if (poiData.belanja.length > 0) items.push(`Pusat belanja/pasar (${poiData.belanja.length}): ${poiData.belanja.slice(0, 4).join(", ")}`);
    if (poiData.ibadah.length > 0) items.push(`Tempat ibadah: ${poiData.ibadah.slice(0, 3).join(", ")}`);
    poiSection = `\n\nFasilitas & Kawasan (radius 2-2.5km, sumber OSM):\n${items.map(i => `- ${i}`).join("\n")}`;
  } else if (hasCoords) {
    poiSection = "\n\nFasilitas & Kawasan: Data tidak tersedia (Overpass timeout)";
  }

  // Competitor section — data dari dokumen resmi Sulsel
  const rawCompetitors: unknown[] = Array.isArray(competitors) ? competitors : [];
  const competitorList: string[] = rawCompetitors.map(c =>
    typeof c === "string" ? c : (typeof c === "object" && c !== null && "name" in c ? String((c as { name: unknown }).name) : "")
  ).filter(Boolean);
  const competitorSection = competitorList.length > 0
    ? `\n\nKompetitor perumahan (sumber: dokumen resmi Sulsel):
- Jumlah: ${competitorList.length} proyek terdaftar di area yang sama
- Nama (${Math.min(competitorList.length, 10)} pertama): ${competitorList.slice(0, 10).join(", ")}${competitorList.length > 10 ? `, dan ${competitorList.length - 10} lainnya` : ""}
- Kondisi pasar: ${competitorList.length <= 3 ? "Persaingan rendah — peluang besar" : competitorList.length <= 10 ? "Kompetitor moderat — demand terbukti" : competitorList.length <= 25 ? "Kompetitor aktif — demand kuat, segmentasi penting" : "Persaingan tinggi — diferensiasi produk sangat penting"}`
    : "\n\nKompetitor: Belum ada data kabupaten/kecamatan prospek untuk pencocokan kompetitor";

  // Survey data section
  const surveyItems: string[] = [];
  if (kondisiJalan) surveyItems.push(`Kondisi jalan: ${kondisiJalan}`);
  if (peilBanjir) surveyItems.push(`Peil banjir: ${peilBanjir}`);
  if (utilitas) surveyItems.push(`Utilitas tersedia: ${utilitas}`);
  if (namaPemilik) surveyItems.push(`Nama pemilik: ${namaPemilik}`);
  if (catatanLapangan) surveyItems.push(`Catatan lapangan: ${catatanLapangan}`);
  const surveySection = surveyItems.length > 0
    ? `\n\nData Survei Lapangan:\n${surveyItems.map(i => `- ${i}`).join("\n")}`
    : "";

  const luasNum = typeof luas === "number" ? luas : parseFloat(luas) || 0;
  const usableArea = luasNum * 0.6;
  const estimasiUnit = Math.floor(usableArea / 100);
  const hargaM2Num = typeof hargaM2 === "number" ? hargaM2 : parseFloat(hargaM2) || 0;
  const totalAkuisisi = luasNum * hargaM2Num;

  const prompt = `Kamu adalah konsultan properti senior yang berpengalaman di pasar Sulawesi Selatan, bekerja untuk Satara Development.

═══ DATA LAHAN ═══
Lokasi: ${lokasi}${[kelurahan, kecamatan, kabupaten].filter(Boolean).length ? ` (${[kelurahan, kecamatan, kabupaten].filter(Boolean).join(", ")})` : ""}
Luas: ${luasNum.toLocaleString("id-ID")} m² (${(luasNum / 10000).toFixed(2)} Ha)
Harga tanah: Rp${hargaM2Num.toLocaleString("id-ID")}/m² → Total akuisisi: Rp${totalAkuisisi.toLocaleString("id-ID")}
ROI input: ${roi}%
Akses Jalan: ${aksesJalan ? `${aksesJalan} meter` : "belum diisi"}
Bentuk Lahan: ${bentukLahan ?? "Belum diisi"}
Status Legal: ${statusLegal ?? "Belum diisi"}
Kapasitas unit estimasi (60% efektif, 10×10m/unit): ±${estimasiUnit} unit
Tahap saat ini: ${currentStage ?? "Prospek Baru"}
Checklist selesai: ${checkedItems ?? 0} item${terrainSection}${poiSection}${competitorSection}${surveySection}

═══ STANDAR KELAYAKAN SATARA ═══
- ROI minimal: >25% (margin >20%)
- Akses jalan: min 5 meter
- Legalitas: clean & clear, SHM paling diutamakan
- Topografi: datar/landai diutamakan (kemiringan <5%)
- Risiko banjir: jarak sungai >300m
- Kompetitor: ada = demand terbukti, tapi >8 = oversaturated

═══ INSTRUKSI ═══
Analisis komprehensif. Dalam "ringkasan" dan "rekomendasi", WAJIB:
1. Sebutkan karakteristik kawasan dan kondisi sekitar lahan secara spesifik
2. Sebutkan fasilitas terdekat yang relevan untuk nilai jual perumahan
3. Berikan penilaian potensi harga jual dan daya beli di kawasan tersebut

Berikan output JSON PERSIS (tanpa markdown, tanpa teks di luar JSON):
{
  "verdict": "Sangat Direkomendasikan" | "Direkomendasikan" | "Perlu Review" | "Tidak Direkomendasikan",
  "score": <angka 0-100>,
  "kategori": "<kategori sama dengan verdict>",
  "ringkasan": "<3-4 kalimat: keputusan + karakteristik kawasan + kondisi lahan + potensi>",
  "kelebihan": ["<poin spesifik 1>", "<poin 2>", "<poin 3>", "<poin 4>"],
  "risiko": ["<risiko spesifik 1>", "<risiko 2>", "<risiko 3>"],
  "rekomendasi": "<3-4 kalimat saran konkret termasuk potensi harga jual dan segmen target>",
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
    req.log.error({ err }, "AI analysis failed");
    res.status(500).json({ error: "Gagal menghubungi layanan AI" });
  }
});

export default router;
