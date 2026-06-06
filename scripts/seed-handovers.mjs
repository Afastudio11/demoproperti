/**
 * Seed handovers only — set readyAkad dulu lalu POST /handovers
 */
const BASE = "http://localhost:8080/api";

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`);
  return res.json();
}
async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`POST ${path} (${res.status}): ${t}`); }
  return res.json();
}
async function patch(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`PATCH ${path} (${res.status}): ${t}`); }
  return res.json();
}

async function main() {
  console.log("\n🌱 Seed Handovers...");

  const projects = await get("/projects");
  const units = await get("/units");
  const customers = await get("/customers");

  const p1 = projects.find(p => p.fase === "BUILD");    // Bantaeng
  const p4 = projects.find(p => p.fase === "HANDOVER"); // Takalar

  const unitsP1 = units.filter(u => u.projectId === p1.id).sort((a, b) => a.id - b.id);
  const unitsP4 = units.filter(u => u.projectId === p4.id).sort((a, b) => a.id - b.id);
  const custP1 = customers.filter(c => c.projectId === p1.id).sort((a, b) => a.id - b.id);
  const custP4 = customers.filter(c => c.projectId === p4.id).sort((a, b) => a.id - b.id);

  const handoverDefs = [
    { unitId: unitsP4[0]?.id, customerId: custP4[0]?.id, tanggal: "2025-03-15", skorKepuasan: 5, catatan: "Puas, rumah rapi dan sesuai spek. Terima kasih Satara!" },
    { unitId: unitsP4[1]?.id, customerId: custP4[1]?.id, tanggal: "2025-01-20", skorKepuasan: 4, catatan: "Bagus, hanya ada 1 retakan kecil sudah ditangani." },
    { unitId: unitsP4[2]?.id, customerId: custP4[2]?.id, tanggal: "2025-02-10", skorKepuasan: 5, catatan: "Sangat puas. Proses serah terima cepat dan profesional." },
    { unitId: unitsP4[3]?.id, customerId: custP4[3]?.id, tanggal: "2025-02-25", skorKepuasan: 4, catatan: "Hampir sempurna. Semoga tahap 2 segera dibuka." },
    { unitId: unitsP4[4]?.id, customerId: custP4[4]?.id, tanggal: "2023-12-18", skorKepuasan: 5, catatan: "Unit pertama yang diserahterimakan. Senang sekali!" },
    { unitId: unitsP1[0]?.id, customerId: custP1[0]?.id, tanggal: "2025-04-05", skorKepuasan: 4, catatan: "Lokasi bagus, dekat sekolah. Puas dengan hasilnya." },
  ].filter(h => h.unitId && h.customerId);

  console.log(`  ${handoverDefs.length} handover akan dibuat`);

  for (const def of handoverDefs) {
    // Set readyAkad dulu
    await patch(`/units/${def.unitId}`, { readyAkad: true });
    const h = await post("/handovers", def);
    console.log(`  BAST: Unit ${def.unitId} → Customer ${def.customerId} (Skor ${def.skorKepuasan}/5) — ID: ${h.id}`);
  }

  console.log("\n  SELESAI! Semua handover dibuat.\n");
}

main().catch(err => { console.error("ERROR:", err.message); process.exit(1); });
