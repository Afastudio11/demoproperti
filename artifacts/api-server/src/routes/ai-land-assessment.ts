import { Router, type IRouter } from "express";
import Groq from "groq-sdk";

const router: IRouter = Router();

router.post("/ai/land-assessment", async (req, res) => {
  const {
    lokasi, kelurahan, kecamatan, kabupaten,
    luas,
    hargaTanahM2,
    aksesJalan,
    fasilitasUmum,
    kondisiLingkungan,
    potensiPertumbuhan,
    utilitas,
    hargaRumahSekitar,
    statusKepemilikan,
    bentukLahan,
    catatan,
    elevMin, elevMax, elevAvg,
    slopeAvgPct, slopeMaxPct,
    waterwayType, waterwayName, waterwayDistM,
  } = req.body;

  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "GROQ_API_KEY tidak dikonfigurasi" });
    return;
  }

  const groq = new Groq({ apiKey });

  const luasNum   = typeof luas === "number"        ? luas        : parseFloat(luas)        || 0;
  const luasHa    = (luasNum / 10000).toFixed(2);
  const hargaM2   = typeof hargaTanahM2 === "number" ? hargaTanahM2 : parseFloat(hargaTanahM2) || 0;
  const totalAkuisisi = luasNum * hargaM2;
  const luasEfektif   = luasNum * 0.60;
  const luasFasum     = luasNum * 0.20;
  const luasJalan     = luasNum * 0.20;
  const estimasiUnit  = Math.floor(luasEfektif / 100);
  const hargaRumahNum = typeof hargaRumahSekitar === "number" ? hargaRumahSekitar : parseFloat(hargaRumahSekitar) || 0;

  const hasTerrainData = elevAvg != null && slopeAvgPct != null;

  const autoKontur = hasTerrainData
    ? (slopeAvgPct < 2 ? "Datar" : slopeAvgPct < 5 ? "Landai" : slopeAvgPct < 15 ? "Miring" : "Curam")
    : null;

  const floodRisk = waterwayDistM == null ? null
    : waterwayDistM < 100 ? "TINGGI"
    : waterwayDistM < 300 ? "SEDANG"
    : waterwayDistM < 500 ? "WASPADA"
    : "AMAN";

  const terrainSection = hasTerrainData
    ? `
DATA TOPOGRAFI SRTM NASA (terukur, gunakan sebagai dasar analisis):
- Elevasi: min ${Number(elevMin).toFixed(0)}m, rata-rata ${Number(elevAvg).toFixed(0)}m, maks ${Number(elevMax).toFixed(0)}m
- Kemiringan lahan: rata-rata ${Number(slopeAvgPct).toFixed(1)}%, maks ${Number(slopeMaxPct).toFixed(1)}%
- Kategori kontur terukur: ${autoKontur}
- Sungai/saluran terdekat: ${waterwayDistM != null ? `${Math.round(waterwayDistM)}m` : "tidak terdeteksi"}${waterwayName ? ` (${waterwayType} ${waterwayName})` : ""}
- Risiko banjir berdasarkan jarak sungai: ${floodRisk ?? "tidak diketahui"}
- Analisis: ${
  autoKontur === "Datar" ? "Lahan datar ideal untuk perumahan, biaya matang normal, tidak perlu cut-fill besar." :
  autoKontur === "Landai" ? "Kemiringan ringan, masih feasible, perlu sedikit cut-fill, biaya matang naik ~5-10%." :
  autoKontur === "Miring" ? "Kemiringan sedang, butuh rekayasa cut-fill signifikan, biaya matang naik 15-25%." :
  "Lahan curam, risiko tinggi, biaya matang bisa naik 30-50%, perlu kajian geoteknik."
}
SUMBER: Data SRTM otomatis — akurat untuk polygon yang digambar.`
    : `
DATA TOPOGRAFI: Tidak ada data SRTM untuk polygon ini.
INSTRUKSI: Estimasi topografi berdasarkan pengetahuan geografis Sulawesi Selatan:
- Kabupaten ${kabupaten ?? ""} / Kecamatan ${kecamatan ?? ""}
- Sulawesi Selatan: pantai barat (Makassar-Barru) umumnya datar-landai; pegunungan tengah (Enrekang-Tana Toraja) curam; pantai timur-selatan (Bantaeng-Bulukumba) bervariasi landai-miring; Bone-Wajo relatif datar.
- Berikan ESTIMASI yang masuk akal. Tandai field topografi.sumber dengan "Estimasi Geografis".
- JANGAN tulis "belum diketahui" atau "tidak ada data" — berikan estimasi terbaik berdasarkan lokasi.`;

  const fasilitasList = Array.isArray(fasilitasUmum) ? fasilitasUmum.join(", ") : (fasilitasUmum ?? "");
  const utilitasList  = Array.isArray(utilitas)      ? utilitas.join(", ")       : (utilitas ?? "");

  const prompt = `Kamu adalah SLIS (Satara Land Intelligence System), konsultan properti senior spesialis pengembangan perumahan di Sulawesi Selatan, milik Satara Development.

Berikan analisis LENGKAP, DETAIL, dan TERSTRUKTUR. Semua angka harus KONKRET — bukan range, bukan placeholder.

════════════════════════════════════════
INFORMASI LAHAN
════════════════════════════════════════
- Lokasi: ${lokasi || ""}${[kelurahan, kecamatan, kabupaten].filter(Boolean).length ? ` (${[kelurahan, kecamatan, kabupaten].filter(Boolean).join(", ")})` : ""}
- Luas polygon: ${luasNum.toLocaleString("id-ID")} m² (${luasHa} Ha)
- Harga tanah: Rp ${hargaM2.toLocaleString("id-ID")}/m²
- Total akuisisi: Rp ${totalAkuisisi.toLocaleString("id-ID")}
- Lebar akses jalan: ${aksesJalan ? `${aksesJalan} meter${parseFloat(aksesJalan) >= 5 ? " ✓ memenuhi standar" : " ✗ di bawah standar min 5m"}` : "Belum diisi"}
- Status kepemilikan: ${statusKepemilikan ?? "Belum diketahui"}
- Bentuk lahan: ${bentukLahan ?? "Tidak diketahui"}
- Fasilitas umum terdekat: ${fasilitasList || "Tidak ada data"}
- Kondisi keamanan: ${kondisiLingkungan ?? "Belum diisi"}
- Potensi pertumbuhan: ${potensiPertumbuhan ?? "Belum diisi"}
- Utilitas tersedia: ${utilitasList || "Tidak ada data"}
- Harga rumah existing sekitar: ${hargaRumahNum > 0 ? `Rp ${hargaRumahNum.toLocaleString("id-ID")}` : "Tidak ada data"}
- Kapasitas estimasi: ${estimasiUnit} unit (60% lahan efektif, kavling 10×10m = 100m²)
- Catatan lapangan: ${catatan || "Tidak ada"}

════════════════════════════════════════
DATA TAPAK & TOPOGRAFI
════════════════════════════════════════
${terrainSection}

════════════════════════════════════════
STANDAR KELAYAKAN SATARA DEVELOPMENT
════════════════════════════════════════
- ROI target: >25% (margin gross >20%)
- Akses jalan minimal: 5 meter (>6m lebih baik)
- Legalitas: SHM diprioritaskan, bebas sengketa
- Kontur ideal: datar/landai (<5% kemiringan)
- Risiko banjir: jarak sungai >300m
- Margin jual: 25-35% di atas HPP
- Segmen sasaran: MBR/Subsidi s/d menengah

════════════════════════════════════════
PEDOMAN PENILAIAN SKOR (0-100)
════════════════════════════════════════
Bobot penilaian:
1. Harga tanah vs pasar lokal (kesesuaian harga): 20%
2. Aksesibilitas jalan (lebar, kondisi): 15%
3. Legalitas (status sertifikat): 15%
4. Potensi pertumbuhan wilayah: 15%
5. ROI potensial (berdasarkan HPP estimasi): 15%
6. Topografi/kontur: 10%
7. Fasilitas & utilitas tersedia: 10%

Kategori:
- 80-100: "Sangat Direkomendasikan"
- 65-79: "Direkomendasikan"
- 50-64: "Perlu Review"
- 0-49: "Tidak Direkomendasikan"

════════════════════════════════════════
OUTPUT JSON YANG DIPERLUKAN
════════════════════════════════════════
Hasilkan HANYA JSON berikut, tanpa teks tambahan, tanpa markdown:
{
  "skor": <integer 0-100 berdasarkan bobot di atas>,
  "kategori": "<salah satu dari 4 kategori di atas>",
  "rekomendasi_harga_maks_m2": <harga maksimum akuisisi per m² dalam rupiah integer, berdasarkan analisis pasar>,
  "proposal_akuisisi": "<Narasi formal 300-400 kata. Paragraf 1: identitas & spesifikasi lahan. Paragraf 2: analisis potensi & keunggulan. Paragraf 3: justifikasi finansial (ROI, margin, payback). Paragraf 4: risiko & mitigasi. Paragraf 5: rekomendasi dan langkah selanjutnya. Gunakan data SRTM jika tersedia, atau estimasi berbasis lokasi.>",
  "topografi": {
    "kategori_kontur": "<Datar|Landai|Miring|Curam>",
    "elevasi_avg_m": <integer meter, estimasi jika tidak ada SRTM>,
    "kemiringan_avg_pct": <float 1 desimal, estimasi jika tidak ada SRTM>,
    "risiko_banjir": "<Rendah|Sedang|Tinggi>",
    "biaya_matang_modifier": "<Normal|+5-10%|+15-25%|+30-50%>",
    "sumber": "<SRTM NASA|Estimasi Geografis>",
    "catatan_tapak": "<2-3 kalimat analisis kondisi fisik lahan berdasarkan topografi, drainase, dan kesesuaian untuk perumahan>"
  },
  "site_analysis": "<Analisis tapak teknis 250-350 kata. Bagian: (1) AKSESIBILITAS: kondisi jalan, jarak ke jalan nasional. (2) TOPOGRAFI: detail kontur, kemiringan, implikasi cut-fill. (3) UTILITAS: kondisi PLN, PDAM, drainase. (4) FASILITAS: analisis fasilitas terdekat dan dampak ke harga jual. (5) RISIKO LOKASI: banjir, longsor, sengketa, regulasi. (6) REKOMENDASI TATA LETAK: orientasi kavling, posisi fasum, akses jalan internal.>",
  "risiko_utama": ["<risiko konkret 1>", "<risiko konkret 2>", "<risiko konkret 3>"],
  "legal_checklist": [
    {"item": "<tindakan legal spesifik>", "prioritas": "<tinggi|sedang|rendah>"},
    {"item": "<tindakan legal spesifik>", "prioritas": "<tinggi|sedang|rendah>"},
    {"item": "<tindakan legal spesifik>", "prioritas": "<tinggi|sedang|rendah>"},
    {"item": "<tindakan legal spesifik>", "prioritas": "<tinggi|sedang|rendah>"},
    {"item": "<tindakan legal spesifik>", "prioritas": "<tinggi|sedang|rendah>"},
    {"item": "<tindakan legal spesifik>", "prioritas": "<tinggi|sedang|rendah>"},
    {"item": "<tindakan legal spesifik>", "prioritas": "<tinggi|sedang|rendah>"}
  ],
  "estimasi_hpp": {
    "asumsi_unit": ${estimasiUnit},
    "luas_efektif_m2": ${Math.round(luasEfektif)},
    "luas_fasum_m2": ${Math.round(luasFasum)},
    "luas_jalan_m2": ${Math.round(luasJalan)},
    "harga_tanah_total": ${Math.round(totalAkuisisi)},
    "harga_tanah_per_unit": ${estimasiUnit > 0 ? Math.round(totalAkuisisi / estimasiUnit) : 0},
    "biaya_matang_per_unit": <biaya matang/infrastruktur/cut-fill per unit, integer rupiah, sesuaikan dengan topografi>,
    "biaya_konstruksi_per_unit": 0,
    "overhead_per_unit": <overhead: perizinan+notaris+marketing+kontingensi per unit, integer rupiah, min 15% dari hpp>,
    "hpp_per_unit": <total HPP = tanah+matang+overhead per unit, integer rupiah>,
    "harga_jual_recommended": <harga jual kavling per unit recommended, integer rupiah, margin 25-35% di atas HPP>,
    "margin_pct": <margin gross persen integer>,
    "total_revenue": <harga_jual_recommended × asumsi_unit, integer rupiah>,
    "total_profit": <total_revenue - harga_tanah_total - (biaya_matang_per_unit+overhead_per_unit)×asumsi_unit, integer rupiah>,
    "roi_pct": <ROI = total_profit/total_investasi × 100, integer>,
    "irr_pct": <IRR estimasi persen integer, biasanya 18-45% untuk proyek bagus>,
    "npv": <NPV estimasi rupiah dengan discount rate 12%, integer>,
    "payback_bulan": <payback period bulan integer, realistis 12-36 bulan>,
    "risk_level": "<Rendah|Sedang|Tinggi>"
  },
  "draft_mou": "<Draft MOU formal 400-500 kata dengan header NOTA KESEPAHAMAN (MOU). Pasal 1 Identitas Para Pihak. Pasal 2 Objek Perjanjian (nama lokasi spesifik, luas, koordinat perkiraan). Pasal 3 Harga dan Cara Pembayaran (angka spesifik dari data lahan). Pasal 4 Jangka Waktu (timeline konkret). Pasal 5 Kewajiban Penjual (sertifikat, bebas sengketa). Pasal 6 Kondisi Penangguhan (jika legalitas bermasalah). Pasal 7 Penyelesaian Sengketa. Tanda tangan para pihak.>"
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.25,
      max_tokens: 4000,
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      req.log.error({ content }, "AI response not valid JSON");
      res.status(500).json({ error: "Format respons AI tidak valid" });
      return;
    }
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    req.log.error({ err }, "Land assessment AI failed");
    res.status(500).json({ error: "Gagal menghubungi layanan AI" });
  }
});

export default router;
