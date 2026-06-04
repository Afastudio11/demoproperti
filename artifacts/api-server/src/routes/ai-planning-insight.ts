import { Router } from "express";
import { createDeepSeekClient, DEEPSEEK_MODEL, SATARA_SYSTEM_PROMPT } from "../lib/deepseek";

const router = Router();

router.post("/ai/planning-insight", async (req, res) => {
  const {
    projectName,
    roi, irr, margin, paybackPeriod, npv, totalRevenue, totalCost, grossProfit,
    bepUnits, totalUnits, peakFunding, discountRate,
    salesPerMonth, kprPct, sellingPricePerUnit,
    passROI, passIRR, passMargin, passPayback,
    kabupaten, location,
  } = req.body;

  const deepseek = createDeepSeekClient();

  const passCount = [passROI, passIRR, passMargin, passPayback].filter(Boolean).length;
  const recommendation = passCount === 4 ? "APPROVE" : passCount >= 2 ? "HOLD" : "REJECT";

  const rp = (v: number) => {
    if (Math.abs(v) >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(2)} M`;
    if (Math.abs(v) >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(0)} jt`;
    return `Rp ${Math.round(v).toLocaleString("id-ID")}`;
  };

  const prompt = `Buat analisis feasibility dan rekomendasi CEO untuk proyek properti berikut.

PROYEK: ${projectName || "—"}
LOKASI: ${kabupaten || location || "Sulawesi Selatan"}

HASIL FINANSIAL:
- Total Revenue: ${rp(totalRevenue ?? 0)}
- Total HPP: ${rp(totalCost ?? 0)}
- Gross Profit: ${rp(grossProfit ?? 0)}
- Margin: ${(margin ?? 0).toFixed(1)}% → standar Satara ≥25% → ${passMargin ? "PASS ✓" : "FAIL ✗"}
- ROI: ${(roi ?? 0).toFixed(1)}% → standar Satara ≥35% → ${passROI ? "PASS ✓" : "FAIL ✗"}
- IRR: ${(irr ?? 0).toFixed(1)}% → standar Satara ≥20% → ${passIRR ? "PASS ✓" : "FAIL ✗"}
- Payback: ${paybackPeriod ?? 0} bulan → standar Satara ≤24 bln → ${passPayback ? "PASS ✓" : "FAIL ✗"}
- NPV (discount ${discountRate ?? 12}%/thn): ${rp(npv ?? 0)}
- BEP: ${bepUnits ?? 0} dari ${totalUnits ?? 0} unit
- Peak Funding: ${rp(peakFunding ?? 0)}
- Harga Jual/Unit: ${rp(sellingPricePerUnit ?? 0)}
- Penjualan: ${salesPerMonth ?? 0} unit/bln, KPR ${kprPct ?? 0}%
- Kriteria lolos: ${passCount}/4 → REKOMENDASI SISTEM: ${recommendation}

Tugas:
1. Berikan penilaian singkat (2-3 kalimat) tentang kesehatan finansial proyek ini
2. Sebutkan 2 kekuatan utama dan 2 risiko utama yang perlu diperhatikan
3. Berikan rekomendasi tindakan konkret (3 poin)
4. Konfirmasi atau nuansakan rekomendasi ${recommendation} dengan alasan spesifik

Bahasa Indonesia, nada profesional tapi ringkas. Gunakan angka dari data di atas — jangan hitung ulang.`;

  try {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Transfer-Encoding", "chunked");

    const stream = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: SATARA_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      stream: true,
      max_tokens: 700,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? "";
      if (text) res.write(text);
    }
    res.end();
  } catch (err) {
    req.log.error({ err }, "AI planning insight failed");
    if (!res.headersSent) {
      res.status(500).json({ error: "AI service error" });
    } else {
      res.end();
    }
  }
});

export default router;
