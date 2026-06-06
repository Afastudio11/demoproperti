/**
 * Satara Dashboard — Seed Script
 * Jalankan: node scripts/seed.mjs
 * Membutuhkan API server berjalan di port 8080
 */

const BASE = "http://localhost:8080/api";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function patch(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

function log(msg) { console.log(`  ${msg}`); }
function section(title) { console.log(`\n${"─".repeat(50)}\n  ${title}\n${"─".repeat(50)}`); }

// ─── 24 Item Pekerjaan Konstruksi ───────────────────────────────────────────

const CONSTRUCTION_ITEMS = [
  { item: "Galian Pondasi", bobot: 3 },
  { item: "Pondasi Batu Kali / Cor", bobot: 5 },
  { item: "Sloof", bobot: 4 },
  { item: "Dinding Bata", bobot: 8 },
  { item: "Kolom Praktis", bobot: 4 },
  { item: "Balok Lintel", bobot: 3 },
  { item: "Ring Balok", bobot: 4 },
  { item: "Plat Lantai / Cor", bobot: 5 },
  { item: "Rangka Atap", bobot: 5 },
  { item: "Penutup Atap", bobot: 4 },
  { item: "Plafon", bobot: 3 },
  { item: "Plesteran & Acian", bobot: 6 },
  { item: "Cat Dinding", bobot: 4 },
  { item: "Pintu & Jendela", bobot: 5 },
  { item: "Instalasi Listrik", bobot: 5 },
  { item: "Instalasi Air Bersih", bobot: 4 },
  { item: "Sanitasi & Septictank", bobot: 4 },
  { item: "Keramik Lantai", bobot: 4 },
  { item: "Keramik Dinding KM", bobot: 3 },
  { item: "Kusen Aluminium", bobot: 2 },
  { item: "Pagar Depan", bobot: 2 },
  { item: "Carport / Teras", bobot: 3 },
  { item: "Landscaping", bobot: 2 },
  { item: "Finishing & Touch-up", bobot: 3 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomNik() {
  return `73${Math.floor(1000000000000 + Math.random() * 8999999999999)}`;
}

function randomPhone() {
  return `08${Math.floor(10000000000 + Math.random() * 89999999999)}`;
}

// ─── MAIN SEED ───────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱 Satara Dashboard — Seed Data");
  console.log("=".repeat(50));

  // ─── 1. PROJECTS ──────────────────────────────────────────────────────────

  section("1. Membuat Proyek (4 proyek)");

  const projects = [];

  const projectDefs = [
    {
      nama: "Perumahan Griya Bantaeng Permai",
      lokasi: "Jl. Poros Bantaeng-Bulukumba KM 3, Bantaeng",
      provinsi: "Sulawesi Selatan",
      kabupaten: "Bantaeng",
      kecamatan: "Bantaeng",
      desa: "Pallantikang",
      luas: 18500,
      totalUnit: 80,
      fase: "BUILD",
      status: "active",
      targetStart: "2024-03-01",
      targetEnd: "2026-06-30",
      lat: -5.532,
      lng: 119.968,
    },
    {
      nama: "Grand Mutiara Gowa Residence",
      lokasi: "Jl. Poros Makassar-Gowa KM 15, Sungguminasa",
      provinsi: "Sulawesi Selatan",
      kabupaten: "Gowa",
      kecamatan: "Somba Opu",
      desa: "Sungguminasa",
      luas: 24000,
      totalUnit: 120,
      fase: "SELL",
      status: "active",
      targetStart: "2023-08-01",
      targetEnd: "2026-12-31",
      lat: -5.1818,
      lng: 119.4672,
    },
    {
      nama: "Bukit Sejahtera Maros",
      lokasi: "Jl. Poros Maros-Makassar KM 8, Turikale",
      provinsi: "Sulawesi Selatan",
      kabupaten: "Maros",
      kecamatan: "Turikale",
      desa: "Adatongeng",
      luas: 14000,
      totalUnit: 60,
      fase: "LEGAL",
      status: "active",
      targetStart: "2025-01-15",
      targetEnd: "2027-03-31",
      lat: -5.0045,
      lng: 119.5729,
    },
    {
      nama: "Griya Indah Takalar",
      lokasi: "Jl. Poros Takalar-Jeneponto KM 5, Pattalassang",
      provinsi: "Sulawesi Selatan",
      kabupaten: "Takalar",
      kecamatan: "Pattalassang",
      desa: "Takalar",
      luas: 12000,
      totalUnit: 50,
      fase: "HANDOVER",
      status: "active",
      targetStart: "2022-06-01",
      targetEnd: "2025-06-30",
      lat: -5.4323,
      lng: 119.3988,
    },
  ];

  for (const def of projectDefs) {
    const proj = await post("/projects", def);
    projects.push(proj);
    log(`Proyek: ${proj.nama} (ID: ${proj.id})`);
  }

  // ─── 2. FEASIBILITY STUDIES ───────────────────────────────────────────────

  section("2. Feasibility Study");

  const feasibilityDefs = [
    { projectId: projects[0].id, hpp: 4800000000, roi: 28.5, margin: 22.1, cashflow: 1200000000, bep: 45, rab: 5100000000, catatan: "HPP sudah termasuk biaya infrastruktur cluster A dan B. Target selesai 18 bulan." },
    { projectId: projects[1].id, hpp: 7200000000, roi: 32.1, margin: 24.3, cashflow: 2100000000, bep: 60, rab: 7500000000, catatan: "Grand Mutiara — segmen menengah ke atas. Kompetitor utama: Ciputra dan Sinar Mas." },
    { projectId: projects[2].id, hpp: 3600000000, roi: 24.8, margin: 19.6, cashflow: 900000000, bep: 35, rab: 3800000000, catatan: "Subsidi FLPP dominan 70%. Perlu bankable gate sebelum marketing resmi." },
    { projectId: projects[3].id, hpp: 3000000000, roi: 31.4, margin: 23.8, cashflow: 1100000000, bep: 30, rab: 2950000000, catatan: "Proyek hampir selesai. 45 dari 50 unit sudah serah terima. Sisa 5 unit dalam proses." },
  ];

  for (const def of feasibilityDefs) {
    const fs = await post("/feasibility", def);
    if (def.projectId === projects[1].id || def.projectId === projects[3].id) {
      await patch(`/feasibility/${fs.id}`, { isApproved: true });
    }
    log(`Feasibility: Proyek ${def.projectId} — ROI ${def.roi}%`);
  }

  // ─── 3. LEGAL DOCUMENTS ───────────────────────────────────────────────────

  section("3. Dokumen Legal");

  const legalDefs = [
    // Proyek 1 - BUILD
    { projectId: projects[0].id, tipeDokumen: "SHM", status: "approved", pic: "Bapak Haris", catatan: "SHM No. 1234/Bantaeng - sudah balik nama" },
    { projectId: projects[0].id, tipeDokumen: "AJB", status: "approved", pic: "Notaris Andi Muis", catatan: "AJB selesai Nov 2023" },
    { projectId: projects[0].id, tipeDokumen: "PKKPR", status: "approved", pic: "Dinas Tata Ruang", catatan: "PKKPR terbit Jan 2024" },
    { projectId: projects[0].id, tipeDokumen: "SPPL", status: "approved", pic: "DLHK Bantaeng", catatan: "SPPL ditandatangani Feb 2024" },
    { projectId: projects[0].id, tipeDokumen: "PBG", status: "in_progress", pic: "Dinas PUPR Bantaeng", catatan: "PBG sedang proses, estimasi terbit Mar 2025" },
    { projectId: projects[0].id, tipeDokumen: "bank_ready", status: "pending", catatan: "Menunggu PBG terbit" },
    { projectId: projects[0].id, tipeDokumen: "sikumbang", status: "pending", catatan: "Akan didaftarkan setelah bank_ready" },
    // Proyek 2 - SELL (bankable)
    { projectId: projects[1].id, tipeDokumen: "SHM", status: "approved", pic: "Bapak Ridwan", catatan: "SHM sudah split per kavling" },
    { projectId: projects[1].id, tipeDokumen: "AJB", status: "approved", pic: "Notaris Candra", catatan: "AJB selesai" },
    { projectId: projects[1].id, tipeDokumen: "PBG", status: "approved", pic: "DPMPTSP Gowa", expiry: "2027-12-31", catatan: "PBG terbit Okt 2023" },
    { projectId: projects[1].id, tipeDokumen: "bank_ready", status: "approved", pic: "Bank BTN Makassar", catatan: "Sudah MoU dengan BTN dan BRI" },
    { projectId: projects[1].id, tipeDokumen: "sikumbang", status: "approved", catatan: "Terdaftar SIKUMBANG REG-2023-4521" },
    { projectId: projects[1].id, tipeDokumen: "PKKPR", status: "approved", pic: "ATR/BPN", catatan: "PKKPR selesai" },
    // Proyek 3 - LEGAL
    { projectId: projects[2].id, tipeDokumen: "SHM", status: "approved", pic: "Bu Rahma", catatan: "SHM atas nama PT Satara" },
    { projectId: projects[2].id, tipeDokumen: "AJB", status: "in_progress", pic: "Notaris Basri", catatan: "AJB dalam proses notaris" },
    { projectId: projects[2].id, tipeDokumen: "PKKPR", status: "in_progress", pic: "ATR/BPN Maros", catatan: "PKKPR sedang diproses" },
    { projectId: projects[2].id, tipeDokumen: "SPPL", status: "pending", catatan: "Menunggu PKKPR selesai" },
    { projectId: projects[2].id, tipeDokumen: "PBG", status: "pending", catatan: "Menunggu SPPL dan PKKPR" },
    // Proyek 4 - HANDOVER (lengkap)
    { projectId: projects[3].id, tipeDokumen: "SHM", status: "approved", pic: "Pak Darmawan", catatan: "SHM sudah balik nama semua unit" },
    { projectId: projects[3].id, tipeDokumen: "PBG", status: "approved", pic: "DPMPTSP Takalar", expiry: "2028-06-30", catatan: "PBG terbit 2022" },
    { projectId: projects[3].id, tipeDokumen: "SLF", status: "approved", pic: "DPMPTSP Takalar", catatan: "SLF terbit setelah inspeksi" },
    { projectId: projects[3].id, tipeDokumen: "bank_ready", status: "approved", catatan: "Bankable semua unit" },
    { projectId: projects[3].id, tipeDokumen: "sikumbang", status: "approved", catatan: "SIKUMBANG REG-2022-0834" },
  ];

  for (const def of legalDefs) {
    await post("/legal", def);
  }
  log(`${legalDefs.length} dokumen legal dibuat`);

  // ─── 4. LAND PROSPECTS ────────────────────────────────────────────────────

  section("4. Prospek Lahan Akuisisi");

  const prospectDefs = [
    {
      lokasi: "Lahan ex-kebun di Kec. Bantaeng, dekat jalan nasional",
      luas: 22000, hargaM2: 280000,
      status: "negosiasi", roi: 29.3, margin: 22.8,
      aksesJalan: 85,
      kabupaten: "Bantaeng", kecamatan: "Bantaeng", kelurahan: "Lamalaka",
      lat: -5.528, lng: 119.950,
      catatan: "Pemilik minta Rp 310rb/m² — sedang negosiasi. Target Rp 270rb/m².",
    },
    {
      lokasi: "Tanah sawah konversi, Somba Opu, Gowa — dekat ring road",
      luas: 31000, hargaM2: 650000,
      status: "analisis_kompetitor", roi: 26.1, margin: 20.4,
      aksesJalan: 92,
      kabupaten: "Gowa", kecamatan: "Somba Opu", kelurahan: "Sungguminasa",
      lat: -5.195, lng: 119.480,
      catatan: "Lokasi strategis tapi harga tinggi. Kompetitor dekat: 3 perumahan aktif.",
    },
    {
      lokasi: "Lahan kosong tepi jalan provinsi, Maros — 4 km dari pusat kota",
      luas: 17500, hargaM2: 185000,
      status: "survey", roi: 31.8, margin: 25.2,
      aksesJalan: 78,
      kabupaten: "Maros", kecamatan: "Turikale", kelurahan: "Adatongeng",
      lat: -5.011, lng: 119.565,
      catatan: "Harga tanah murah. Perlu survei topografi. Akses jalan cukup baik.",
    },
    {
      lokasi: "Eks lahan perkebunan, Pangkep — potensi 200+ unit",
      luas: 45000, hargaM2: 120000,
      status: "prospek_baru", roi: 34.5, margin: 27.1,
      aksesJalan: 65,
      kabupaten: "Pangkajene dan Kepulauan", kecamatan: "Pangkajene", kelurahan: "Mappasaile",
      lat: -4.8367, lng: 119.5299,
      catatan: "Lahan besar dengan harga murah. Perlu klarifikasi status SHM. Akses jalan belum memadai.",
    },
    {
      lokasi: "Lahan strategis depan RSUD, Bone — pusat kota",
      luas: 9800, hargaM2: 520000,
      status: "legal_checking", roi: 22.4, margin: 17.8,
      aksesJalan: 95,
      kabupaten: "Bone", kecamatan: "Tanete Riattang", kelurahan: "Watampone",
      lat: -4.5379, lng: 120.3327,
      catatan: "Lokasi premium tapi harga mahal. Legal check sedang berjalan — 2 SHM perlu dipersatukan.",
    },
    {
      lokasi: "Lahan pinggiran kota, Takalar — 2 km dari proyek aktif Satara",
      luas: 14200, hargaM2: 210000,
      status: "pks_mou", roi: 28.9, margin: 22.5,
      aksesJalan: 80,
      kabupaten: "Takalar", kecamatan: "Pattalassang", kelurahan: "Takalar",
      lat: -5.440, lng: 119.405,
      catatan: "Pemilik setuju PKS. Jadwal penandatanganan MoU: 15 Juli 2025. Lanjut ke DP.",
    },
    {
      lokasi: "Tanah kosong dekat kampus Unhas, Maros",
      luas: 8500, hargaM2: 380000,
      status: "prospek_baru", roi: 25.2, margin: 19.8,
      aksesJalan: 88,
      kabupaten: "Maros", kecamatan: "Mandai", kelurahan: "Hasanuddin",
      lat: -5.065, lng: 119.552,
      catatan: "Dekat akses tol dan bandara. Permintaan student housing dan KPR tinggi.",
    },
  ];

  for (const def of prospectDefs) {
    const p = await post("/land-prospects", def);
    log(`Prospek: ${p.lokasi.slice(0, 60)}...`);
  }

  // ─── 5. UNITS ─────────────────────────────────────────────────────────────

  section("5. Unit per Proyek");

  const allUnitIds = { p1: [], p2: [], p3: [], p4: [] };

  // Proyek 1 (BUILD) — 20 unit, berbagai progress
  const unitDefsP1 = [];
  const bloksP1 = ["A", "A", "A", "A", "A", "B", "B", "B", "B", "B", "C", "C", "C", "C", "C", "D", "D", "D", "D", "D"];
  const statusesP1 = ["serah_terima","akad","kpr_process","kpr_process","booked","akad","kpr_process","booked","available","available","booked","available","available","available","available","available","available","available","available","available"];
  for (let i = 0; i < 20; i++) {
    unitDefsP1.push({
      projectId: projects[0].id,
      blok: bloksP1[i],
      nomor: String((i % 5) + 1),
      tipe: i < 10 ? "Rumah Tapak 36/72" : "Rumah Tapak 45/90",
      harga: i < 10 ? 185000000 : 245000000,
      status: statusesP1[i],
    });
  }
  for (const def of unitDefsP1) {
    const u = await post("/units", def);
    allUnitIds.p1.push(u.id);
  }
  log(`Proyek 1 (Bantaeng): ${unitDefsP1.length} unit`);

  // Proyek 2 (SELL) — 25 unit
  const unitDefsP2 = [];
  const bloksP2 = ["A","A","A","A","A","B","B","B","B","B","C","C","C","C","C","D","D","D","D","D","E","E","E","E","E"];
  const statusesP2 = ["serah_terima","akad","akad","kpr_process","kpr_process","booked","booked","booked","available","available","booked","kpr_process","akad","serah_terima","akad","available","available","available","available","available","booked","available","available","available","available"];
  for (let i = 0; i < 25; i++) {
    unitDefsP2.push({
      projectId: projects[1].id,
      blok: bloksP2[i],
      nomor: String((i % 5) + 1),
      tipe: i % 3 === 0 ? "Rumah Tapak 54/105" : i % 3 === 1 ? "Rumah Tapak 45/90" : "Ruko",
      harga: i % 3 === 0 ? 420000000 : i % 3 === 1 ? 320000000 : 650000000,
      status: statusesP2[i],
    });
  }
  for (const def of unitDefsP2) {
    const u = await post("/units", def);
    allUnitIds.p2.push(u.id);
  }
  log(`Proyek 2 (Gowa): ${unitDefsP2.length} unit`);

  // Proyek 3 (LEGAL) — 15 unit available
  const unitDefsP3 = [];
  for (let i = 0; i < 15; i++) {
    unitDefsP3.push({
      projectId: projects[2].id,
      blok: i < 8 ? "A" : "B",
      nomor: String((i % 8) + 1),
      tipe: "Rumah Tapak 36/72",
      harga: 168000000,
      status: "available",
    });
  }
  for (const def of unitDefsP3) {
    const u = await post("/units", def);
    allUnitIds.p3.push(u.id);
  }
  log(`Proyek 3 (Maros): ${unitDefsP3.length} unit`);

  // Proyek 4 (HANDOVER) — 20 unit, mayoritas serah terima
  const unitDefsP4 = [];
  const statusesP4 = ["serah_terima","serah_terima","serah_terima","serah_terima","serah_terima","serah_terima","serah_terima","serah_terima","serah_terima","serah_terima","serah_terima","serah_terima","serah_terima","serah_terima","akad","akad","kpr_process","kpr_process","booked","available"];
  for (let i = 0; i < 20; i++) {
    unitDefsP4.push({
      projectId: projects[3].id,
      blok: i < 10 ? "A" : "B",
      nomor: String((i % 10) + 1),
      tipe: "Rumah Tapak 36/72",
      harga: 148000000,
      status: statusesP4[i],
    });
  }
  for (const def of unitDefsP4) {
    const u = await post("/units", def);
    allUnitIds.p4.push(u.id);
  }
  log(`Proyek 4 (Takalar): ${unitDefsP4.length} unit`);

  // ─── 6. CUSTOMERS ─────────────────────────────────────────────────────────

  section("6. Customer / Pembeli");

  const customerDefs = [
    // Proyek 1 (Bantaeng)
    { projectId: projects[0].id, unitId: allUnitIds.p1[0], nama: "Andi Karim Laode", nik: randomNik(), kontak: randomPhone(), pekerjaan: "PNS Guru", bank: "BTN", statusKpr: "selesai", catatan: "Sudah serah terima. Kepuasan baik." },
    { projectId: projects[0].id, unitId: allUnitIds.p1[1], nama: "Nur Aisyah Binti Rahman", nik: randomNik(), kontak: randomPhone(), pekerjaan: "Honorer Pemerintah", bank: "BTN", statusKpr: "akad", catatan: "Akad dilakukan 10 Maret 2025" },
    { projectId: projects[0].id, unitId: allUnitIds.p1[2], nama: "Muhammad Yusuf Saleh", nik: randomNik(), kontak: randomPhone(), pekerjaan: "Wiraswasta", bank: "BRI", statusKpr: "sp3k", catatan: "SP3K terbit. Jadwal akad bulan depan." },
    { projectId: projects[0].id, unitId: allUnitIds.p1[3], nama: "Fatimah Binti Abdullah", nik: randomNik(), kontak: randomPhone(), pekerjaan: "Bidan RSUD", bank: "BNI", statusKpr: "input_bank", catatan: "Berkas sudah di bank BNI." },
    { projectId: projects[0].id, unitId: allUnitIds.p1[5], nama: "Baharuddin Hamid", nik: randomNik(), kontak: randomPhone(), pekerjaan: "TNI Aktif", bank: "BTN", statusKpr: "akad", catatan: "Cicilan pertama sudah bayar." },
    // Proyek 2 (Gowa)
    { projectId: projects[1].id, unitId: allUnitIds.p2[0], nama: "Sitti Rahma Dewi", nik: randomNik(), kontak: randomPhone(), pekerjaan: "Dokter Spesialis", bank: "Mandiri", statusKpr: "selesai", catatan: "Kepuasan tinggi, recommend ke teman." },
    { projectId: projects[1].id, unitId: allUnitIds.p2[1], nama: "Iqbal Wicaksono", nik: randomNik(), kontak: randomPhone(), pekerjaan: "Pengusaha", bank: "Cash", statusKpr: "selesai", catatan: "KPR tunai langsung." },
    { projectId: projects[1].id, unitId: allUnitIds.p2[2], nama: "Nurfatima Hakim", nik: randomNik(), kontak: randomPhone(), pekerjaan: "Staf BUMN", bank: "BTN", statusKpr: "akad", catatan: "Akad Gowa cluster B." },
    { projectId: projects[1].id, unitId: allUnitIds.p2[3], nama: "Ahmad Fauzi Ramli", nik: randomNik(), kontak: randomPhone(), pekerjaan: "Pejabat Eselon III", bank: "BRI", statusKpr: "sp3k", catatan: "SP3K BRI sudah keluar." },
    { projectId: projects[1].id, unitId: allUnitIds.p2[5], nama: "Rusmiati Lewa", nik: randomNik(), kontak: randomPhone(), pekerjaan: "Dosen", bank: "BTN", statusKpr: "follow_up", catatan: "BI checking clear. Sedang lengkapi slip gaji." },
    { projectId: projects[1].id, unitId: allUnitIds.p2[6], nama: "Herman Suwardi", nik: randomNik(), kontak: randomPhone(), pekerjaan: "Kontraktor", bank: "BNI", statusKpr: "collect_berkas", catatan: "Berkas sedang dikumpulkan." },
    // Proyek 4 (Takalar - sudah banyak serah terima)
    { projectId: projects[3].id, unitId: allUnitIds.p4[0], nama: "Rahmatullah Basri", nik: randomNik(), kontak: randomPhone(), pekerjaan: "Petani Maju", bank: "BRI", statusKpr: "selesai", catatan: "Serah terima Maret 2025, puas." },
    { projectId: projects[3].id, unitId: allUnitIds.p4[1], nama: "Hajjah Norma Binti Daud", nik: randomNik(), kontak: randomPhone(), pekerjaan: "Pedagang", bank: "BTN", statusKpr: "selesai", catatan: "Pindah Jan 2025." },
    { projectId: projects[3].id, unitId: allUnitIds.p4[2], nama: "Iskandar Muda Tanri", nik: randomNik(), kontak: randomPhone(), pekerjaan: "Polri Aktif", bank: "BRI", statusKpr: "selesai", catatan: "Cicilan lancar." },
    { projectId: projects[3].id, unitId: allUnitIds.p4[3], nama: "Salmah Binti Hadi", nik: randomNik(), kontak: randomPhone(), pekerjaan: "Guru SD", bank: "BTN", statusKpr: "selesai", catatan: "Serah terima Feb 2025." },
    { projectId: projects[3].id, unitId: allUnitIds.p4[4], nama: "Dg. Naba Lapong", nik: randomNik(), kontak: randomPhone(), pekerjaan: "Petani", bank: "BRI", statusKpr: "selesai", catatan: "Akad dilakukan 2023, sudah pindah." },
  ];

  const customers = [];
  for (const def of customerDefs) {
    const c = await post("/customers", def);
    customers.push(c);
    log(`Customer: ${c.nama} (${c.statusKpr})`);
  }

  // ─── 7. LEADS ─────────────────────────────────────────────────────────────

  section("7. Lead Marketing");

  const leadDefs = [
    // Proyek 1
    { projectId: projects[0].id, nama: "Ambo Baso", kontak: randomPhone(), source: "meta_ads", status: "lead_masuk", assignedTo: "Andi Sales", campaign: "FB Lead Gen Q1 2025" },
    { projectId: projects[0].id, nama: "Wati Suryani", kontak: randomPhone(), source: "instagram", status: "qualified", assignedTo: "Andi Sales" },
    { projectId: projects[0].id, nama: "Jupri Hasan", kontak: randomPhone(), source: "referral", status: "survey", assignedTo: "Budi Santoso" },
    { projectId: projects[0].id, nama: "Hasna Makmur", kontak: randomPhone(), source: "broker", status: "booking", assignedTo: "Andi Sales" },
    { projectId: projects[0].id, nama: "Rudi Setiawan", kontak: randomPhone(), source: "meta_ads", status: "lead_masuk", campaign: "TikTok Ads Mar 2025" },
    { projectId: projects[0].id, nama: "Irma Wahyuni", kontak: randomPhone(), source: "event", status: "qualified", assignedTo: "Budi Santoso", campaign: "Pameran Properti Bantaeng" },
    { projectId: projects[0].id, nama: "Faisal Amir", kontak: randomPhone(), source: "lainnya", status: "batal", assignedTo: "Andi Sales" },
    // Proyek 2
    { projectId: projects[1].id, nama: "Yusran Darwis", kontak: randomPhone(), source: "instagram", status: "berkas_kpr", assignedTo: "Cici Marketing" },
    { projectId: projects[1].id, nama: "Mardiana Syukur", kontak: randomPhone(), source: "meta_ads", status: "akad", assignedTo: "Cici Marketing", campaign: "Google Ads Gowa" },
    { projectId: projects[1].id, nama: "Asri Purnama", kontak: randomPhone(), source: "broker", status: "booking", assignedTo: "Dedi Sales" },
    { projectId: projects[1].id, nama: "Khadijah Mustafa", kontak: randomPhone(), source: "tiktok", status: "survey", assignedTo: "Cici Marketing", campaign: "TikTok Gowa Residence" },
    { projectId: projects[1].id, nama: "Hendra Irawan", kontak: randomPhone(), source: "referral", status: "qualified", assignedTo: "Dedi Sales" },
    { projectId: projects[1].id, nama: "Rosmawati Lawa", kontak: randomPhone(), source: "facebook", status: "lead_masuk" },
    { projectId: projects[1].id, nama: "Nasir Gani", kontak: randomPhone(), source: "afiliator", status: "booking", assignedTo: "Dedi Sales" },
    { projectId: projects[1].id, nama: "Sumiati Binti Idris", kontak: randomPhone(), source: "meta_ads", status: "lead_masuk", campaign: "FB Lead Gen Gowa" },
    // Proyek 3
    { projectId: projects[2].id, nama: "Takwin Hasanuddin", kontak: randomPhone(), source: "instagram", status: "lead_masuk", campaign: "IG Promo Maros" },
    { projectId: projects[2].id, nama: "Nursanti Baso", kontak: randomPhone(), source: "meta_ads", status: "qualified", assignedTo: "Eko Prabowo" },
    { projectId: projects[2].id, nama: "Dahlan Kadir", kontak: randomPhone(), source: "referral", status: "survey", assignedTo: "Eko Prabowo" },
  ];

  for (const def of leadDefs) {
    await post("/leads", def);
  }
  log(`${leadDefs.length} leads dibuat`);

  // ─── 8. CONSTRUCTION TASKS ────────────────────────────────────────────────

  section("8. Pekerjaan Konstruksi");

  // Seed untuk 6 unit pertama Proyek 1 (paling progress)
  const progressByStatus = {
    serah_terima: "selesai",
    akad: "selesai",
    kpr_process: "dalam_proses",
    booked: "dalam_proses",
    available: "belum_mulai",
  };

  const unitStatuses = statusesP1.slice(0, 6);
  for (let ui = 0; ui < 6; ui++) {
    const unitId = allUnitIds.p1[ui];
    const unitStatus = unitStatuses[ui];
    const doneCount = unitStatus === "serah_terima" ? 24 : unitStatus === "akad" ? 20 : 12;

    for (let ci = 0; ci < CONSTRUCTION_ITEMS.length; ci++) {
      const item = CONSTRUCTION_ITEMS[ci];
      const taskStatus = ci < doneCount ? "selesai" : ci < doneCount + 3 ? "dalam_proses" : "belum_mulai";
      await post("/construction/tasks", {
        unitId,
        item: item.item,
        bobot: item.bobot,
        status: taskStatus,
        ...(taskStatus !== "belum_mulai" ? { tanggalMulai: "2024-06-01" } : {}),
      });
    }
    log(`Konstruksi unit ${unitId} (${unitStatus}): ${doneCount}/24 item selesai`);
  }

  // Proyek 4 — unit pertama (serah terima semua)
  for (let ui = 0; ui < 5; ui++) {
    const unitId = allUnitIds.p4[ui];
    for (const item of CONSTRUCTION_ITEMS) {
      await post("/construction/tasks", {
        unitId,
        item: item.item,
        bobot: item.bobot,
        status: "selesai",
        tanggalMulai: "2023-01-01",
      });
    }
  }
  log(`Konstruksi 5 unit Proyek 4 (Takalar): semua selesai`);

  // ─── 9. QC DEFECTS ────────────────────────────────────────────────────────

  section("9. QC Defect");

  const qcDefs = [
    { unitId: allUnitIds.p1[2], kategori: "Plester & Cat", deskripsi: "Retakan halus di dinding kamar tidur utama. Perlu acian ulang." },
    { unitId: allUnitIds.p1[2], kategori: "Sanitasi", deskripsi: "Kran kamar mandi tetap menetes saat ditutup penuh." },
    { unitId: allUnitIds.p1[3], kategori: "Pintu & Jendela", deskripsi: "Kusen pintu depan tidak rata, pintu sulit menutup sempurna." },
    { unitId: allUnitIds.p1[5], kategori: "Keramik", deskripsi: "2 buah keramik dapur retak, perlu diganti." },
    { unitId: allUnitIds.p2[2], kategori: "Listrik", deskripsi: "Stop kontak di ruang tamu tidak berfungsi." },
    { unitId: allUnitIds.p2[3], kategori: "Atap", deskripsi: "Ada rembesan air di plafon pojok kamar anak saat hujan deras." },
    { unitId: allUnitIds.p4[0], kategori: "Cat", deskripsi: "Cat eksterior kusam di sisi kanan bangunan." },
    { unitId: allUnitIds.p4[1], kategori: "Plumbing", deskripsi: "Pipa saluran air kotor bocor di bawah wastafel." },
  ];

  const qcCreated = [];
  for (const def of qcDefs) {
    const qc = await post("/qc/defects", def);
    qcCreated.push(qc);
  }
  // Tutup beberapa defect
  await patch(`/qc/defects/${qcCreated[0].id}`, { status: "in_repair" });
  await patch(`/qc/defects/${qcCreated[1].id}`, { status: "verified", verifiedBy: "QC Budi" });
  await patch(`/qc/defects/${qcCreated[6].id}`, { status: "closed", verifiedBy: "QC Andi" });
  log(`${qcDefs.length} QC defect dibuat`);

  // ─── 10. MATERIALS ────────────────────────────────────────────────────────

  section("10. Stok Material");

  const materialDefs = [
    // Proyek 1 (Bantaeng)
    { projectId: projects[0].id, item: "Besi Beton D13", stok: 2400, satuan: "batang", vendor: "UD Besi Jaya Bantaeng", harga: 95000, minimumStock: 1000 },
    { projectId: projects[0].id, item: "Semen Tonasa 50kg", stok: 180, satuan: "sak", vendor: "Toko Bangunan Maju", harga: 68000, minimumStock: 200 },
    { projectId: projects[0].id, item: "Bata Merah", stok: 45000, satuan: "buah", vendor: "Pabrik Bata Bantaeng", harga: 1200, minimumStock: 20000 },
    { projectId: projects[0].id, item: "Pasir Bangunan", stok: 30, satuan: "m³", vendor: "UD Pasir Bantaeng", harga: 250000, minimumStock: 15 },
    { projectId: projects[0].id, item: "Koral/Batu Pecah", stok: 12, satuan: "m³", vendor: "UD Quarry Loka", harga: 280000, minimumStock: 20 },
    { projectId: projects[0].id, item: "Cat Dulux Interior", stok: 45, satuan: "kaleng", vendor: "Toko Cat Setia", harga: 185000, minimumStock: 50 },
    // Proyek 2 (Gowa)
    { projectId: projects[1].id, item: "Besi Beton D16", stok: 5500, satuan: "batang", vendor: "PT Baja Makassar", harga: 145000, minimumStock: 2000 },
    { projectId: projects[1].id, item: "Semen Tiga Roda 50kg", stok: 350, satuan: "sak", vendor: "Distributor Gowa Makmur", harga: 72000, minimumStock: 300 },
    { projectId: projects[1].id, item: "Genteng Keramik", stok: 8500, satuan: "buah", vendor: "CV Atap Indah", harga: 12000, minimumStock: 3000 },
    { projectId: projects[1].id, item: "Keramik Platinum 60x60", stok: 2200, satuan: "dus", vendor: "Griya Keramik Makassar", harga: 125000, minimumStock: 1000 },
    { projectId: projects[1].id, item: "Kabel NYM 2.5mm", stok: 180, satuan: "roll", vendor: "Toko Listrik Jaya", harga: 350000, minimumStock: 100 },
    { projectId: projects[1].id, item: "Pipa PVC 4 inch", stok: 85, satuan: "batang", vendor: "Wavin Distributor", harga: 65000, minimumStock: 200 },
    // Proyek 4 (Takalar)
    { projectId: projects[3].id, item: "Cat Weathershield Eksterior", stok: 8, satuan: "kaleng", vendor: "Toko Bangunan Takalar", harga: 320000, minimumStock: 10 },
    { projectId: projects[3].id, item: "Semen Tonasa 50kg", stok: 25, satuan: "sak", vendor: "Distributor Takalar", harga: 68000, minimumStock: 30 },
  ];

  for (const def of materialDefs) {
    await post("/materials", def);
  }
  log(`${materialDefs.length} material dibuat (beberapa di bawah minimum stok)`);

  // ─── 11. HANDOVERS ────────────────────────────────────────────────────────

  section("11. Serah Terima (BAST)");

  const handoverPairs = [
    { unitId: allUnitIds.p4[0], customerId: customers[11].id, tanggal: "2025-03-15", skorKepuasan: 5, catatan: "Puas, rumah rapi dan sesuai spek. Terima kasih Satara!" },
    { unitId: allUnitIds.p4[1], customerId: customers[12].id, tanggal: "2025-01-20", skorKepuasan: 4, catatan: "Bagus, hanya ada 1 retakan kecil sudah ditangani." },
    { unitId: allUnitIds.p4[2], customerId: customers[13].id, tanggal: "2025-02-10", skorKepuasan: 5, catatan: "Sangat puas. Proses serah terima cepat dan profesional." },
    { unitId: allUnitIds.p4[3], customerId: customers[14].id, tanggal: "2025-02-25", skorKepuasan: 4, catatan: "Hampir sempurna. Semoga tahap 2 segera dibuka." },
    { unitId: allUnitIds.p4[4], customerId: customers[15].id, tanggal: "2023-12-18", skorKepuasan: 5, catatan: "Unit pertama yang diserahterimakan. Senang sekali!" },
    { unitId: allUnitIds.p1[0], customerId: customers[0].id, tanggal: "2025-04-05", skorKepuasan: 4, catatan: "Lokasi bagus, deket sekolah. Puas dengan hasilnya." },
  ];

  for (const def of handoverPairs) {
    await post("/handovers", def);
    log(`BAST: Unit ${def.unitId} → Customer ${def.customerId} (Skor ${def.skorKepuasan}/5)`);
  }

  // ─── SELESAI ──────────────────────────────────────────────────────────────

  console.log("\n" + "=".repeat(50));
  console.log("  SELESAI! Seed data berhasil dibuat:");
  console.log(`  - ${projects.length} proyek`);
  console.log(`  - ${feasibilityDefs.length} feasibility study`);
  console.log(`  - ${legalDefs.length} dokumen legal`);
  console.log(`  - ${prospectDefs.length} prospek lahan`);
  console.log(`  - ${unitDefsP1.length + unitDefsP2.length + unitDefsP3.length + unitDefsP4.length} unit`);
  console.log(`  - ${customerDefs.length} customer / pembeli`);
  console.log(`  - ${leadDefs.length} lead marketing`);
  console.log(`  - ${6 * 24 + 5 * 24} item konstruksi`);
  console.log(`  - ${qcDefs.length} QC defect`);
  console.log(`  - ${materialDefs.length} material stok`);
  console.log(`  - ${handoverPairs.length} serah terima (BAST)`);
  console.log("=".repeat(50) + "\n");
}

main().catch(err => {
  console.error("\nFATAL ERROR:", err.message);
  process.exit(1);
});
