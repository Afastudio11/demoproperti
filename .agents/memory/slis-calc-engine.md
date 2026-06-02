---
name: SLIS Calculation Engine separation
description: Pattern for separating deterministic financial calculation from AI narrative in land analysis features.
---

## Rule
All financial numbers in SLIS land assessment must be computed by the Calculation Engine in TypeScript code — never by AI. AI only writes narrative text explaining the pre-computed results.

**Why:** AI models generate inconsistent numbers across runs, making the analysis unreliable for management decisions. Deterministic code gives reproducible, auditable numbers.

**How to apply:** Every time a new analysis feature is built:
1. Write a pure `calculateXxx(input)` function that returns all metrics
2. Pass the full computed result to AI in the prompt with explicit "DO NOT change these numbers"
3. AI prompt requests only narrative fields (narasi, analisis, rekomendasi, deskripsi) — zero numeric fields
4. API response has `calc: {...}` (all numbers) and `ai: {...}` (all text)
5. Frontend MetricCards render from `result.calc.*`, never from `result.ai.*`

## Key Calculation Logic (ai-land-assessment.ts)

**Land Allocation:**
- jalan 22%, fasum 12%, tidak_efektif = bentukFaktor + konturFaktor (capped 25%), efektif = remainder (min 35%)
- bentukFaktor: kotak=4%, persegi_panjang=6%, l_shape=12%, segitiga=15%, tidak_beraturan=10%
- konturFaktor: Datar=4%, Landai=6%, Miring=12%, Curam=18%

**Unit Potential (by tipe):**
- subsidi: kavling=72m², min=60, max=84
- komersial_kecil: kavling=90m², min=72, max=108
- komersial_menengah: kavling=120m², min=96, max=150

**Financial Model:**
- totalHPP = (akuisisi + infrastruktur + legal + konstruksi) × 1.05 (kontingency)
- infrastruktur = akuisisi × pctInfra × konturModifier (datar=1.0, landai=1.08, miring=1.22, curam=1.45)
- maxHargaM2 formula: solve for land price that keeps ROI ≥ 25%
- payback = totalHPP / (revenue / 24 months)

**Scoring Weights (per spec):**
- Lokasi & akses 20%, Harga 20%, ROI 20%, Unit 15%, Legal 10%, Pasar 10%, Teknis 5%

**Decision:**
- BELI: score ≥ 85
- BELI_DENGAN_NEGOSIASI: score 70-84 AND priceRatio > 0.95
- HOLD: score 55-69
- JANGAN_BELI: score < 55
