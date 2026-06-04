export function calcLandAnalysis(landArea: number) {
  const roadArea = landArea * 0.18;
  const fasumArea = landArea * 0.12;
  const effectiveArea = landArea * 0.70;
  return { roadArea, fasumArea, effectiveArea };
}

export function calcMaxUnits(effectiveArea: number, kavlingArea: number): number {
  if (kavlingArea <= 0) return 0;
  return Math.floor(effectiveArea / kavlingArea);
}

export function calcNPV(cashflows: number[], discountRate: number): number {
  const r = discountRate / 100 / 12;
  return cashflows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + r, t), 0);
}

export function calcIRR(cashflows: number[]): number {
  if (cashflows.length < 2) return 0;
  let lo = -0.99;
  let hi = 10.0;
  const npvAtRate = (r: number) =>
    cashflows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + r, t), 0);
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npvAtRate(mid) > 0) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-8) break;
  }
  const monthlyIRR = (lo + hi) / 2;
  return monthlyIRR * 12 * 100;
}

export function calcPayback(cashflows: number[]): number {
  let cumulative = 0;
  for (let i = 0; i < cashflows.length; i++) {
    cumulative += cashflows[i];
    if (cumulative >= 0) return i;
  }
  return cashflows.length;
}

export interface FeasibilityInputs {
  landCost: number;
  landPrepCost: number;
  constructionCostPerUnit: number;
  fasumRoadCost: number;
  permitCost: number;
  marketingCost: number;
  overheadCost: number;
  contingencyPct: number;
  sellingPricePerUnit: number;
  totalUnits: number;
  bookingFeePerUnit: number;
  salesPerMonth: number;
  kprPct: number;
  cashHardPct: number;
  cashInstallmentPct: number;
  discountRate: number;
}

export interface FeasibilityResult {
  totalRevenue: number;
  constructionTotal: number;
  contingency: number;
  totalCost: number;
  grossProfit: number;
  margin: number;
  roi: number;
  irr: number;
  npv: number;
  paybackPeriod: number;
  bepUnits: number;
  monthlyCashflows: number[];
  peakFunding: number;
  passROI: boolean;
  passIRR: boolean;
  passPayback: boolean;
  passMargin: boolean;
}

export function calcFeasibility(inp: FeasibilityInputs): FeasibilityResult {
  const totalRevenue = inp.sellingPricePerUnit * inp.totalUnits;
  const constructionTotal = inp.constructionCostPerUnit * inp.totalUnits;
  const baseCost = inp.landCost + inp.landPrepCost + constructionTotal +
    inp.fasumRoadCost + inp.permitCost + inp.marketingCost + inp.overheadCost;
  const contingency = baseCost * (inp.contingencyPct / 100);
  const totalCost = baseCost + contingency;
  const grossProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const roi = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0;
  const bepUnits = inp.sellingPricePerUnit > 0
    ? Math.ceil(totalCost / inp.sellingPricePerUnit) : 0;

  const monthsToSellAll = inp.salesPerMonth > 0
    ? Math.ceil(inp.totalUnits / inp.salesPerMonth) : 36;
  const projectDuration = monthsToSellAll + 12;
  const monthlyCashflows: number[] = new Array(projectDuration).fill(0);

  monthlyCashflows[0] -= inp.landCost + inp.landPrepCost + inp.permitCost;
  const constructionMonths = Math.min(monthsToSellAll, 24);
  for (let m = 1; m <= constructionMonths; m++) {
    monthlyCashflows[m] -= (constructionTotal + inp.fasumRoadCost) / constructionMonths;
  }
  const monthlyOverhead = inp.overheadCost / Math.max(projectDuration, 1);
  const monthlyMarketing = inp.marketingCost / Math.max(monthsToSellAll, 1);
  for (let m = 0; m < projectDuration; m++) {
    monthlyCashflows[m] -= monthlyOverhead;
    if (m < monthsToSellAll) monthlyCashflows[m] -= monthlyMarketing;
  }
  for (let m = 0; m < monthsToSellAll; m++) {
    const unitsSold = Math.min(inp.salesPerMonth, inp.totalUnits - m * inp.salesPerMonth);
    if (unitsSold <= 0) continue;
    monthlyCashflows[m] += unitsSold * inp.bookingFeePerUnit;
    const htMonth = Math.min(m + 3, projectDuration - 1);
    const kprAmt = inp.sellingPricePerUnit * (inp.kprPct / 100) * unitsSold;
    const cashHardAmt = inp.sellingPricePerUnit * (inp.cashHardPct / 100) * unitsSold;
    monthlyCashflows[htMonth] += kprAmt + cashHardAmt;
  }

  const irr = calcIRR(monthlyCashflows);
  const npv = calcNPV(monthlyCashflows, inp.discountRate);
  const paybackPeriod = calcPayback(
    monthlyCashflows.reduce((acc: number[], cf, i) => {
      acc.push((acc[i - 1] ?? 0) + cf);
      return acc;
    }, [])
  );
  let peakFunding = 0;
  let cumulative = 0;
  for (const cf of monthlyCashflows) {
    cumulative += cf;
    if (cumulative < peakFunding) peakFunding = cumulative;
  }
  peakFunding = Math.abs(peakFunding);

  return {
    totalRevenue, constructionTotal, contingency, totalCost,
    grossProfit, margin, roi, irr, npv, paybackPeriod, bepUnits,
    monthlyCashflows, peakFunding,
    passROI: roi >= 35,
    passIRR: irr >= 20,
    passPayback: paybackPeriod <= 24,
    passMargin: margin >= 25,
  };
}

export function calcDemandScore(data: {
  populationGrowth: number;
  backlogHousing: number;
  marriageRate: number;
  flppEligible: number;
  purchasePower: number;
  roadAccess: number;
  nearTolPlaza: number;
  nearSchool: number;
  nearMarket: number;
}): number {
  const weights = {
    populationGrowth: 0.20,
    backlogHousing: 0.20,
    marriageRate: 0.10,
    flppEligible: 0.15,
    purchasePower: 0.10,
    roadAccess: 0.10,
    nearTolPlaza: 0.05,
    nearSchool: 0.05,
    nearMarket: 0.05,
  };
  const normalize = (val: number, max: number) => Math.min(val / max, 1) * 100;
  const scores = {
    populationGrowth: normalize(data.populationGrowth, 5),
    backlogHousing: normalize(data.backlogHousing, 10000),
    marriageRate: normalize(data.marriageRate, 10000),
    flppEligible: normalize(data.flppEligible, 80),
    purchasePower: normalize(data.purchasePower, 100),
    roadAccess: data.roadAccess,
    nearTolPlaza: normalize(1 / (data.nearTolPlaza + 0.1), 1 / 0.1) * 100,
    nearSchool: normalize(1 / (data.nearSchool + 0.1), 1 / 0.1) * 100,
    nearMarket: normalize(1 / (data.nearMarket + 0.1), 1 / 0.1) * 100,
  };
  let total = 0;
  for (const key of Object.keys(weights) as (keyof typeof weights)[]) {
    total += scores[key] * weights[key];
  }
  return Math.round(total * 10) / 10;
}

export function trafficLight(roi: number, irr: number, payback: number, margin: number) {
  const passROI = roi >= 35;
  const passIRR = irr >= 20;
  const passPayback = payback <= 24;
  const passMargin = margin >= 25;
  const passes = [passROI, passIRR, passPayback, passMargin].filter(Boolean).length;
  return {
    passROI, passIRR, passPayback, passMargin,
    overall: passes === 4 ? "GO" : passes >= 2 ? "REVIEW" : "NO-GO",
    color: passes === 4 ? "green" : passes >= 2 ? "yellow" : "red",
  };
}

export function fmtCurrency(val: number): string {
  if (Math.abs(val) >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(2)} M`;
  if (Math.abs(val) >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1)} jt`;
  return `Rp ${val.toLocaleString("id-ID")}`;
}

export function fmtPct(val: number): string {
  return `${val.toFixed(1)}%`;
}
