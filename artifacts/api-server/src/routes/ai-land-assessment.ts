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

  const luasNum = typeof luas === "number" ? luas : parseFloat(luas) || 0;
  const luasHa = (luasNum / 10000).toFixed(2);
  const hargaM2Num = typeof hargaTanahM2 === "number" ? hargaTanahM2 : parseFloat(hargaTanahM2) || 0;
  const totalAkuisisi = luasNum * hargaM2Num;
  const usableArea = luasNum * 0.6;
  const estimasiUnit = Math.floor(usableArea / 100);
  const hargaRumahNum = typeof hargaRumahSekitar === "number" ? hargaRumahSekitar : parseFloat(hargaRumahSekitar) || 0;

  const hasTerrainData = elevAvg != null;
  const autoKontur = hasTerrainData
    ? (slopeAvgPct < 2 ? "Datar" : slopeAvgPct < 5 ? "Landai" : slopeAvgPct < 15 ? "Miring" : "Curam")
    : "Belum diketahui";

  const terrainSection = hasTerrainData
    ? `
Kontur Lahan (SRTM NASA):
- Elevasi: min ${elevMin}m, rata-rata ${elevAvg}m, maks ${elevMax}m
- Kemiringan rata-rata: ${Number(slopeAvgPct).toFixed(1)}%, maks: ${Number(slopeMaxPct).toFixed(1)}%
- Kategori: ${autoKontur}
- Sungai terdekat: ${waterwayDistM != null ? `${Math.round(waterwayDistM)}m` : "tidak diketahui"}${waterwayName ? ` (${waterwayType} ${waterwayName})` : ""}
- Risiko banjir: ${waterwayDistM == null ? "tidak diketahui" : waterwayDistM < 100 ? "TINGGI" : waterwayDistM < 300 ? "SEDANG" : waterwayDistM < 500 ? "WASPADA" : "AMAN"}`
    : `\nKontur: ${autoKontur}`;

  const fasilitasList = Array.isArray(fasilitasUmum) ? fasilitasUmum.join(", ") : (fasilitasUmum ?? "Tidak ada data");
  const utilitasList = Array.isArray(utilitas) ? utilitas.join(", ") : (utilitas ?? "Tidak ada data");

  const prompt = `Kamu adalah SLIS (Satara Land Intelligence System), konsultan properti senior spesialis Sulawesi Selatan milik Satara Development.

═══ INFORMASI LAHAN ═══
- Lokasi: ${lokasi}${[kelurahan, kecamatan, kabupaten].filter(Boolean).length ? ` (${[kelurahan, kecamatan, kabupaten].filter(Boolean).join(", ")})` : ""}
- Luas polygon: ${luasNum.toLocaleString("id-ID")} m² (${luasHa} Ha)
- Harga tanah: Rp ${hargaM2Num.toLocaleString("id-ID")}/m² — Total akuisisi: Rp ${totalAkuisisi.toLocaleString("id-ID")}
- Lebar akses jalan: ${aksesJalan ? `${aksesJalan} meter` : "Belum diisi"}
- Status kepemilikan: ${statusKepemilikan ?? "Belum diketahui"}
- Fasilitas umum terdekat: ${fasilitasList || "Tidak ada"}
- Kondisi keamanan: ${kondisiLingkungan ?? "Belum diisi"}
- Potensi pertumbuhan: ${potensiPertumbuhan ?? "Belum diisi"}
- Utilitas tersedia: ${utilitasList || "Tidak ada"}
- Harga rumah sekitar: ${hargaRumahNum > 0 ? `Rp ${hargaRumahNum.toLocaleString("id-ID")}` : "Tidak ada data"}
- Kapasitas estimasi: ${estimasiUnit} unit (60% efektif, kavling 10×10m)
- Catatan: ${catatan || "Tidak ada"}${terrainSection}

═══ STANDAR KELAYAKAN SATARA ═══
- ROI target: >25% (margin >20%)
- Akses jalan minimal: 5 meter
- Legalitas: SHM lebih diutamakan, bebas sengketa
- Kontur: datar/landai (<5% kemiringan)
- Risiko banjir: jarak sungai >300m
- Harga jual: margin 25-35% di atas HPP

═══ INSTRUKSI OUTPUT ═══
Hasilkan JSON tepat berikut (TANPA markdown, TANPA teks di luar JSON):
{
  "proposal_akuisisi": "<Proposal resmi Satara Development, 300-400 kata, paragraf formal. Sertakan: identitas lahan, analisis potensi, justifikasi akuisisi, rekomendasi harga maksimal, dan langkah selanjutnya.>",
  "site_analysis": "<Analisis tapak teknis, 250-350 kata. Sertakan: aksesibilitas, topografi & kemiringan, ketersediaan fasilitas, kondisi utilitas, risiko lokasi, dan rekomendasi tata letak.>",
  "legal_checklist": ["<item legal 1>", "<item legal 2>", "<item legal 3>"],
  "estimasi_hpp": {
    "asumsi_unit": ${estimasiUnit},
    "harga_tanah_total": ${Math.round(totalAkuisisi)},
    "matang_per_unit": <biaya matang/infrastruktur per unit rupiah integer>,
    "overhead_per_unit": <overhead perizinan+notaris+marketing+kontingensi per unit rupiah integer>,
    "hpp_per_unit": <total HPP per unit rupiah integer>,
    "harga_jual_recommended": <harga jual per unit recommended rupiah integer>,
    "margin_pct": <margin persen integer>,
    "total_revenue": <total revenue rupiah integer>,
    "total_profit": <total profit rupiah integer>,
    "roi_pct": <ROI persen integer>,
    "payback_bulan": <payback period bulan integer>
  },
  "draft_mou": "<Draft MOU formal 400-500 kata. Sertakan: Para Pihak (PT Satara Development & Penjual), Pasal 1 Objek Perjanjian, Pasal 2 Harga dan Cara Bayar, Pasal 3 Jangka Waktu, Pasal 4 Pengurusan Sertifikat, Pasal 5 Kondisi Penangguhan, Pasal 6 Penyelesaian Sengketa. Isi pasal harus spesifik mengacu data lahan.>"
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 3000,
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
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
