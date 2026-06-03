import { Router, type IRouter } from "express";
import { createDeepSeekClient, DEEPSEEK_MODEL, SATARA_SYSTEM_PROMPT, filterOwnCompany } from "../lib/deepseek";

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

  const deepseek = createDeepSeekClient();

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
  const competitorList: string[] = filterOwnCompany(
    rawCompetitors.map(c =>
      typeof c === "string" ? c : (typeof c === "object" && c !== null && "name" in c ? String((c as { name: unknown }).name) : "")
    ).filter(Boolean)
  );
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

  const luasHa = (luasNum / 10000).toFixed(2);
  const totalAkuisisiStr = `Rp${totalAkuisisi.toLocaleString("id-ID")}`;

  const prompt = `═══════════════════════════════════════════════════════════════
DATA PROSPEK LAHAN — SATARA DEVELOPMENT
═══════════════════════════════════════════════════════════════

IDENTITAS LAHAN:
  Nama/Lokasi  : ${lokasi}
  Kelurahan    : ${kelurahan ?? "—"}
  Kecamatan    : ${kecamatan ?? "—"}
  Kabupaten    : ${kabupaten ?? "—"}
  Status Legal : ${statusLegal ?? "Belum diketahui"}
  Pemilik      : ${namaPemilik ?? "Belum diketahui"}

FISIK LAHAN:
  Luas Total   : ${luasNum.toLocaleString("id-ID")} m² (${luasHa} Ha)
  Bentuk Lahan : ${bentukLahan ?? "Belum diisi"}
  Akses Jalan  : ${aksesJalan ? `${aksesJalan} meter` : "Belum diisi"}${terrainSection}${surveySection}

FINANSIAL:
  Harga Tanah  : Rp${hargaM2Num.toLocaleString("id-ID")}/m²
  Total Akuisisi: ${totalAkuisisiStr}
  ROI Input    : ${roi}%
  Est. Unit (60% efektif, 100m²/unit): ±${estimasiUnit} unit
  Tahap Pipeline: ${currentStage ?? "Prospek Baru"}
  Checklist Due Diligence: ${checkedItems ?? 0} item selesai
${poiSection}${competitorSection}

═══ STANDAR KELAYAKAN WAJIB SATARA DEVELOPMENT ═══
  ✓ ROI minimal 25% (margin gross >20%)
  ✓ Akses jalan minimal 5 meter
  ✓ Status legal: SHM diutamakan, HGB masih acceptable
  ✓ Topografi: datar/landai (slope <5%)
  ✓ Jarak sungai >300m (risiko banjir rendah)
  ✓ Kompetitor 3-8: demand terbukti, tidak oversaturated

═══ INSTRUKSI ANALISIS MENDALAM ═══
Lakukan analisis komprehensif sebagai konsultan properti senior.
WAJIB dalam setiap bagian:
1. Gunakan data nyata tentang kawasan ${[kecamatan, kabupaten].filter(Boolean).join(", ") || "ini"}
2. Sebutkan nama fasilitas, jalan, atau landmark spesifik yang kamu ketahui di area tersebut
3. Analisis daya beli dan profil pembeli potensial di kawasan ini
4. Berikan estimasi harga jual yang realistis vs kompetitor pasar
5. Identifikasi risiko tersembunyi yang sering terlewat developer

Output HARUS berupa JSON valid saja (tanpa markdown, tanpa teks di luar JSON):
{
  "verdict": "Sangat Direkomendasikan" | "Direkomendasikan" | "Perlu Review" | "Tidak Direkomendasikan",
  "score": <integer 0-100 berdasarkan standar kelayakan Satara>,
  "kategori": "<sama dengan verdict>",
  "ringkasan": "<4-5 kalimat SUBSTANTIF: (1) keputusan dan alasannya, (2) karakteristik kawasan dan lingkungan sekitar yang spesifik — sebutkan landmark/infrastruktur nyata, (3) kondisi fisik dan legal lahan, (4) potensi dan proyeksi nilai properti ke depan, (5) catatan kritis jika ada>",
  "kelebihan": [
    "<kelebihan 1: spesifik dengan angka/data, contoh: 'Akses jalan 8m, 2x standar minimum Satara — memungkinkan produk tipe 36/72 dengan parkir di halaman'>",
    "<kelebihan 2: spesifik>",
    "<kelebihan 3: spesifik>",
    "<kelebihan 4: spesifik>",
    "<kelebihan 5: spesifik — tambah jika ada>"
  ],
  "risiko": [
    "<risiko 1: spesifik dengan dampak finansial/operasional konkret>",
    "<risiko 2: spesifik dengan probabilitas dan severity>",
    "<risiko 3: risiko tersembunyi yang sering diabaikan developer>",
    "<risiko 4: jika ada>"
  ],
  "rekomendasi": "<4-5 kalimat ACTIONABLE: (1) keputusan beli/tidak beli dengan kondisi spesifik, (2) target harga negosiasi yang realistis dengan justifikasi, (3) segmen produk yang paling cocok (subsidi/komersial/mix) dengan alasan demografis, (4) strategi marketing dan pricing vs kompetitor, (5) langkah due diligence paling kritis>",
  "potensiUnit": <integer realistis berdasarkan luas efektif dan tipe produk>,
  "hargaMaksAkuisisi": <integer harga maks per m² agar ROI ≥25%>,
  "roiEstimasi": <integer ROI realistis % berdasarkan data pasar>,
  "paybackBulan": <integer bulan payback period realistis>,
  "potensiRevenue": <integer estimasi total revenue rupiah>,
  "estimasiHPP": <integer estimasi HPP total rupiah>,
  "estimasiProfit": <integer estimasi profit rupiah>,
  "irr": <integer IRR % realistis atau null>,
  "npv": <integer NPV rupiah dengan discount rate 15% atau null>,
  "efektivitasKavling": <integer % kavling efektif dari total lahan>,
  "luasFasum": <integer m² untuk fasilitas umum>,
  "luasJalan": <integer m² untuk jalan internal>,
  "tingkatRisiko": "Rendah" | "Sedang" | "Tinggi"
}`;

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
      res.status(500).json({ error: "Format respons AI tidak valid" });
      return;
    }
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    const apiErr = err as { message?: string; status?: number; error?: { message?: string } };
    const errDetail = apiErr?.error?.message || apiErr?.message || String(err);
    req.log.error({ err, errDetail }, "AI analysis failed");
    res.status(500).json({ error: `Gagal menghubungi layanan AI: ${errDetail}` });
  }
});

export default router;
