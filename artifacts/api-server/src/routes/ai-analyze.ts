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
  } = req.body;

  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "GROQ_API_KEY tidak dikonfigurasi" });
    return;
  }

  const groq = new Groq({ apiKey });

  const terrainSection = (elevAvg != null)
    ? `\nData Kontur Lahan (dari SRTM NASA):
- Elevasi: min ${elevMin}m, rata-rata ${elevAvg}m, maks ${elevMax}m
- Kemiringan rata-rata: ${slopeAvgPct?.toFixed(1)}%, maks ${slopeMaxPct?.toFixed(1)}%
- Sungai/saluran terdekat: ${waterwayDistM != null ? `${Math.round(waterwayDistM)}m` : "tidak diketahui"}${waterwayName ? ` (${waterwayType} ${waterwayName})` : ""}`
    : "";

  const prompt = `Kamu adalah konsultan properti senior berpengalaman di Indonesia, khususnya Sulawesi Selatan.
Berikan analisis kelayakan akuisisi lahan berikut secara singkat, padat, dan profesional dalam Bahasa Indonesia.

Data Lahan:
- Lokasi: ${lokasi}${[kelurahan, kecamatan, kabupaten].filter(Boolean).length ? `, ${[kelurahan, kecamatan, kabupaten].filter(Boolean).join(", ")}` : ""}
- Luas: ${luas?.toLocaleString("id-ID")} m²
- Harga/m²: Rp${hargaM2?.toLocaleString("id-ID")}
- Estimasi ROI: ${roi}%
- Akses Jalan: ${aksesJalan ? `${aksesJalan} meter` : "belum diisi"}
- Tahap saat ini: ${currentStage ?? "Prospek Baru"}
- Checklist selesai: ${checkedItems ?? 0} item${terrainSection}

Standar kelayakan perusahaan:
- ROI minimal >25%, margin >20%
- Akses jalan minimal 5 meter
- Legalitas clean & clear, bebas sengketa
- Market potensial tinggi

Berikan analisis dalam format JSON persis seperti ini (tanpa markdown, tanpa penjelasan di luar JSON):
{
  "verdict": "LAYAK" | "PERLU KAJIAN" | "TIDAK LAYAK",
  "score": <angka 0-100>,
  "ringkasan": "<1-2 kalimat ringkasan keputusan>",
  "kelebihan": ["<poin 1>", "<poin 2>", "<poin 3 jika ada>"],
  "risiko": ["<risiko 1>", "<risiko 2>", "<risiko 3 jika ada>"],
  "rekomendasi": "<1-2 kalimat saran tindak lanjut konkret>"
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 600,
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
