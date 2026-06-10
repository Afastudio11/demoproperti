# QA Full Test Report

Generated: 2026-06-10T13:24:20.375Z

## Summary

- Passed: 163
- Failed: 0
- Blocked: 0
- Warnings: 0

## Environment

- APP_BASE: `http://localhost:5000`
- API_BASE: `http://localhost:8080/api`
- DATABASE_URL: set
- QA admin username: `qa_admin`
- QA admin password: `qa_admin_12345`

## Seeded Data

```json
{
  "admin": {
    "id": 2,
    "username": "qa_admin"
  },
  "project": {
    "id": 1,
    "nama": "QA-SATARA Analisis Lahan Gowa",
    "lokasi": "Somba Opu, Gowa",
    "provinsi": "Sulawesi Selatan",
    "kabupaten": "Gowa",
    "kecamatan": "Somba Opu",
    "desa": "Paccinongang",
    "luas": 24000,
    "total_unit": 96,
    "fase": "FEASIBILITY",
    "status": "active",
    "target_start": "2026-06-10",
    "target_end": "2027-02-28",
    "lat": -5.189,
    "lng": 119.456,
    "created_at": "2026-06-10T13:17:51.638Z",
    "updated_at": "2026-06-10T13:17:51.638Z"
  },
  "landId": 1,
  "prospectId": 1,
  "marketId": 1,
  "feasibilityId": 1,
  "landbankId": 1,
  "materialId": 1,
  "contractId": 1,
  "unitId": 1,
  "employeeId": 1
}
```

## Checks

| Status | Check | Result |
| --- | --- | --- |
| pass | db.connection | Database bisa diakses. |
| pass | db.compatColumns | Kolom kompatibilitas sinkronisasi HR/material dipastikan ada. |
| pass | db.seed.admin | Akun admin QA siap: qa_admin. |
| pass | db.seed.qaData | Fake database QA untuk analisis lahan, material, subkon, unit, absensi, dan lembur sudah tersedia. |
| pass | api.health | API health bisa diakses. |
| pass | api.auth.login | Login admin QA berhasil. |
| pass | api.get./projects | Daftar proyek OK. |
| pass | api.get./planning/land | Planning lahan OK. |
| pass | api.get./land-prospects | Prospek lahan OK. |
| pass | api.get./planning/market | Market planning OK. |
| pass | api.get./planning/feasibility | Feasibility planning OK. |
| pass | api.get./planning/landbank | Landbank planning OK. |
| pass | api.get./produksi/subkon/master | Master subkon dari kontrak OK. |
| pass | api.get./produksi/subkon/contracts | Kontrak subkon OK. |
| pass | api.get./produksi/material/master | Master material OK. |
| pass | api.get./produksi/material/in | Material masuk OK. |
| pass | api.get./produksi/material/out | Material keluar OK. |
| pass | api.get./produksi/material/stok | Stok material terhitung OK. |
| pass | api.get./hr/employees | Master karyawan OK. |
| pass | api.get./hr/attendance | Absensi OK. |
| pass | api.get./hr/overtime | Lembur OK. |
| pass | api.get./hr/culture | Culture sync dari absensi OK. |
| pass | api.get./finance/cashflow | Cashflow finance OK. |
| pass | api.get./dashboard/summary | Dashboard executive summary OK. |
| pass | flow.materialOut.destination | Material keluar QA terdeteksi sampai tujuan proyek, kontrak, tahap, unit, subkon, dan master material. |
| pass | flow.materialStock.computed | Stok material QA dihitung dari material masuk minus material keluar. |
| pass | flow.hrAttendance.employeeProject | Absensi QA terhubung ke master karyawan dan proyek. |
| pass | flow.hrOvertime.employeeProject | Lembur QA terhubung ke master karyawan dan proyek. |
| pass | flow.landAnalysis.downstream | Analisis lahan QA mengalir ke landbank dengan projectId. |
| pass | ui.route./teamwork | Route UI /teamwork mengembalikan HTML SPA. |
| pass | ui.route./executive | Route UI /executive mengembalikan HTML SPA. |
| pass | ui.route./projects | Route UI /projects mengembalikan HTML SPA. |
| pass | ui.route./projects/1 | Route UI /projects/1 mengembalikan HTML SPA. |
| pass | ui.route./akuisisi | Route UI /akuisisi mengembalikan HTML SPA. |
| pass | ui.route./perencanaan | Route UI /perencanaan mengembalikan HTML SPA. |
| pass | ui.route./perencanaan/pasar | Route UI /perencanaan/pasar mengembalikan HTML SPA. |
| pass | ui.route./perencanaan/lahan | Route UI /perencanaan/lahan mengembalikan HTML SPA. |
| pass | ui.route./perencanaan/produk | Route UI /perencanaan/produk mengembalikan HTML SPA. |
| pass | ui.route./perencanaan/feasibility | Route UI /perencanaan/feasibility mengembalikan HTML SPA. |
| pass | ui.route./perencanaan/timeline | Route UI /perencanaan/timeline mengembalikan HTML SPA. |
| pass | ui.route./perencanaan/cashflow | Route UI /perencanaan/cashflow mengembalikan HTML SPA. |
| pass | ui.route./perencanaan/sdm | Route UI /perencanaan/sdm mengembalikan HTML SPA. |
| pass | ui.route./perencanaan/landbank | Route UI /perencanaan/landbank mengembalikan HTML SPA. |
| pass | ui.route./perencanaan/kpp/1/simulasi | Route UI /perencanaan/kpp/1/simulasi mengembalikan HTML SPA. |
| pass | ui.route./perencanaan/ekspansi/kesiapan | Route UI /perencanaan/ekspansi/kesiapan mengembalikan HTML SPA. |
| pass | ui.route./perencanaan/ekspansi/skenario | Route UI /perencanaan/ekspansi/skenario mengembalikan HTML SPA. |
| pass | ui.route./perencanaan/timeline/warning | Route UI /perencanaan/timeline/warning mengembalikan HTML SPA. |
| pass | ui.route./legal | Route UI /legal mengembalikan HTML SPA. |
| pass | ui.route./legal/permit | Route UI /legal/permit mengembalikan HTML SPA. |
| pass | ui.route./legal/lahan | Route UI /legal/lahan mengembalikan HTML SPA. |
| pass | ui.route./legal/shm | Route UI /legal/shm mengembalikan HTML SPA. |
| pass | ui.route./legal/issue | Route UI /legal/issue mengembalikan HTML SPA. |
| pass | ui.route./legal/arsip | Route UI /legal/arsip mengembalikan HTML SPA. |
| pass | ui.route./marketing | Route UI /marketing mengembalikan HTML SPA. |
| pass | ui.route./marketing/lead/new | Route UI /marketing/lead/new mengembalikan HTML SPA. |
| pass | ui.route./marketing/lead/1/edit | Route UI /marketing/lead/1/edit mengembalikan HTML SPA. |
| pass | ui.route./marketing/lead/1 | Route UI /marketing/lead/1 mengembalikan HTML SPA. |
| pass | ui.route./marketing/lead | Route UI /marketing/lead mengembalikan HTML SPA. |
| pass | ui.route./marketing/branding | Route UI /marketing/branding mengembalikan HTML SPA. |
| pass | ui.route./marketing/campaign | Route UI /marketing/campaign mengembalikan HTML SPA. |
| pass | ui.route./marketing/sales | Route UI /marketing/sales mengembalikan HTML SPA. |
| pass | ui.route./marketing/absorption | Route UI /marketing/absorption mengembalikan HTML SPA. |
| pass | ui.route./marketing/stock | Route UI /marketing/stock mengembalikan HTML SPA. |
| pass | ui.route./marketing/forecast | Route UI /marketing/forecast mengembalikan HTML SPA. |
| pass | ui.route./marketing/demand-score | Route UI /marketing/demand-score mengembalikan HTML SPA. |
| pass | ui.route./marketing/kompetitor | Route UI /marketing/kompetitor mengembalikan HTML SPA. |
| pass | ui.route./marketing/health | Route UI /marketing/health mengembalikan HTML SPA. |
| pass | ui.route./administrasi | Route UI /administrasi mengembalikan HTML SPA. |
| pass | ui.route./administrasi/customer/new | Route UI /administrasi/customer/new mengembalikan HTML SPA. |
| pass | ui.route./administrasi/customer/1/edit | Route UI /administrasi/customer/1/edit mengembalikan HTML SPA. |
| pass | ui.route./administrasi/customer/1 | Route UI /administrasi/customer/1 mengembalikan HTML SPA. |
| pass | ui.route./administrasi/customer | Route UI /administrasi/customer mengembalikan HTML SPA. |
| pass | ui.route./administrasi/bank-submission | Route UI /administrasi/bank-submission mengembalikan HTML SPA. |
| pass | ui.route./administrasi/ots | Route UI /administrasi/ots mengembalikan HTML SPA. |
| pass | ui.route./administrasi/sp3k | Route UI /administrasi/sp3k mengembalikan HTML SPA. |
| pass | ui.route./administrasi/akad | Route UI /administrasi/akad mengembalikan HTML SPA. |
| pass | ui.route./administrasi/ht | Route UI /administrasi/ht mengembalikan HTML SPA. |
| pass | ui.route./administrasi/bank-performance | Route UI /administrasi/bank-performance mengembalikan HTML SPA. |
| pass | ui.route./administrasi/aging | Route UI /administrasi/aging mengembalikan HTML SPA. |
| pass | ui.route./administrasi/target | Route UI /administrasi/target mengembalikan HTML SPA. |
| pass | ui.route./administrasi/komplain | Route UI /administrasi/komplain mengembalikan HTML SPA. |
| pass | ui.route./administrasi/dokumen/1 | Route UI /administrasi/dokumen/1 mengembalikan HTML SPA. |
| pass | ui.route./administrasi/import | Route UI /administrasi/import mengembalikan HTML SPA. |
| pass | ui.route./produksi | Route UI /produksi mengembalikan HTML SPA. |
| pass | ui.route./produksi/progress/proyek | Route UI /produksi/progress/proyek mengembalikan HTML SPA. |
| pass | ui.route./produksi/progress/tahap | Route UI /produksi/progress/tahap mengembalikan HTML SPA. |
| pass | ui.route./produksi/progress/unit | Route UI /produksi/progress/unit mengembalikan HTML SPA. |
| pass | ui.route./produksi/fasum | Route UI /produksi/fasum mengembalikan HTML SPA. |
| pass | ui.route./produksi/subkon/kontrak | Route UI /produksi/subkon/kontrak mengembalikan HTML SPA. |
| pass | ui.route./produksi/subkon/termin | Route UI /produksi/subkon/termin mengembalikan HTML SPA. |
| pass | ui.route./produksi/subkon/approval | Route UI /produksi/subkon/approval mengembalikan HTML SPA. |
| pass | ui.route./produksi/subkon/performa | Route UI /produksi/subkon/performa mengembalikan HTML SPA. |
| pass | ui.route./produksi/material/master | Route UI /produksi/material/master mengembalikan HTML SPA. |
| pass | ui.route./produksi/material/masuk | Route UI /produksi/material/masuk mengembalikan HTML SPA. |
| pass | ui.route./produksi/material/keluar | Route UI /produksi/material/keluar mengembalikan HTML SPA. |
| pass | ui.route./produksi/material/stok | Route UI /produksi/material/stok mengembalikan HTML SPA. |
| pass | ui.route./produksi/material/konsumsi | Route UI /produksi/material/konsumsi mengembalikan HTML SPA. |
| pass | ui.route./produksi/material/variance | Route UI /produksi/material/variance mengembalikan HTML SPA. |
| pass | ui.route./produksi/material/forecast | Route UI /produksi/material/forecast mengembalikan HTML SPA. |
| pass | ui.route./produksi/qc/checklist | Route UI /produksi/qc/checklist mengembalikan HTML SPA. |
| pass | ui.route./produksi/qc/rework | Route UI /produksi/qc/rework mengembalikan HTML SPA. |
| pass | ui.route./produksi/qc/defect | Route UI /produksi/qc/defect mengembalikan HTML SPA. |
| pass | ui.route./produksi/ready-akad | Route UI /produksi/ready-akad mengembalikan HTML SPA. |
| pass | ui.route./produksi/analitik/velocity | Route UI /produksi/analitik/velocity mengembalikan HTML SPA. |
| pass | ui.route./produksi/analitik/baseline | Route UI /produksi/analitik/baseline mengembalikan HTML SPA. |
| pass | ui.route./produksi/analitik/cost-to-complete | Route UI /produksi/analitik/cost-to-complete mengembalikan HTML SPA. |
| pass | ui.route./produksi/analitik/cashflow-impact | Route UI /produksi/analitik/cashflow-impact mengembalikan HTML SPA. |
| pass | ui.route./produksi/analitik/produktivitas | Route UI /produksi/analitik/produktivitas mengembalikan HTML SPA. |
| pass | ui.route./produksi/analitik/eligibilitas | Route UI /produksi/analitik/eligibilitas mengembalikan HTML SPA. |
| pass | ui.route./produksi/analitik/forecast | Route UI /produksi/analitik/forecast mengembalikan HTML SPA. |
| pass | ui.route./produksi/health | Route UI /produksi/health mengembalikan HTML SPA. |
| pass | ui.route./settings | Route UI /settings mengembalikan HTML SPA. |
| pass | ui.route./slis | Route UI /slis mengembalikan HTML SPA. |
| pass | ui.route./hr | Route UI /hr mengembalikan HTML SPA. |
| pass | ui.route./hr/organisasi | Route UI /hr/organisasi mengembalikan HTML SPA. |
| pass | ui.route./hr/rekrutmen | Route UI /hr/rekrutmen mengembalikan HTML SPA. |
| pass | ui.route./hr/kpi/definisi | Route UI /hr/kpi/definisi mengembalikan HTML SPA. |
| pass | ui.route./hr/kpi/input | Route UI /hr/kpi/input mengembalikan HTML SPA. |
| pass | ui.route./hr/performance | Route UI /hr/performance mengembalikan HTML SPA. |
| pass | ui.route./hr/kompetensi | Route UI /hr/kompetensi mengembalikan HTML SPA. |
| pass | ui.route./hr/training | Route UI /hr/training mengembalikan HTML SPA. |
| pass | ui.route./hr/karir | Route UI /hr/karir mengembalikan HTML SPA. |
| pass | ui.route./hr/kompensasi | Route UI /hr/kompensasi mengembalikan HTML SPA. |
| pass | ui.route./hr/produktivitas | Route UI /hr/produktivitas mengembalikan HTML SPA. |
| pass | ui.route./hr/suksesi | Route UI /hr/suksesi mengembalikan HTML SPA. |
| pass | ui.route./hr/kultur | Route UI /hr/kultur mengembalikan HTML SPA. |
| pass | ui.route./hr/workload | Route UI /hr/workload mengembalikan HTML SPA. |
| pass | ui.route./hr/ekspansi | Route UI /hr/ekspansi mengembalikan HTML SPA. |
| pass | ui.route./hr/talent-map | Route UI /hr/talent-map mengembalikan HTML SPA. |
| pass | ui.route./hr/flight-risk | Route UI /hr/flight-risk mengembalikan HTML SPA. |
| pass | ui.route./hr/hc-score | Route UI /hr/hc-score mengembalikan HTML SPA. |
| pass | ui.route./hr/absensi | Route UI /hr/absensi mengembalikan HTML SPA. |
| pass | ui.route./hr/lembur | Route UI /hr/lembur mengembalikan HTML SPA. |
| pass | ui.route./hr/masalah | Route UI /hr/masalah mengembalikan HTML SPA. |
| pass | ui.route./branding | Route UI /branding mengembalikan HTML SPA. |
| pass | ui.route./branding/korporat | Route UI /branding/korporat mengembalikan HTML SPA. |
| pass | ui.route./branding/founder | Route UI /branding/founder mengembalikan HTML SPA. |
| pass | ui.route./branding/konten/kalender | Route UI /branding/konten/kalender mengembalikan HTML SPA. |
| pass | ui.route./branding/konten/produksi | Route UI /branding/konten/produksi mengembalikan HTML SPA. |
| pass | ui.route./branding/konten/new | Route UI /branding/konten/new mengembalikan HTML SPA. |
| pass | ui.route./branding/konten | Route UI /branding/konten mengembalikan HTML SPA. |
| pass | ui.route./branding/sosmed | Route UI /branding/sosmed mengembalikan HTML SPA. |
| pass | ui.route./branding/performa-konten | Route UI /branding/performa-konten mengembalikan HTML SPA. |
| pass | ui.route./branding/proyek | Route UI /branding/proyek mengembalikan HTML SPA. |
| pass | ui.route./branding/pr | Route UI /branding/pr mengembalikan HTML SPA. |
| pass | ui.route./branding/sentimen | Route UI /branding/sentimen mengembalikan HTML SPA. |
| pass | ui.route./branding/roi | Route UI /branding/roi mengembalikan HTML SPA. |
| pass | ui.route./branding/trust | Route UI /branding/trust mengembalikan HTML SPA. |
| pass | ui.route./branding/health | Route UI /branding/health mengembalikan HTML SPA. |
| pass | ui.route./finance | Route UI /finance mengembalikan HTML SPA. |
| pass | ui.route./finance/upload | Route UI /finance/upload mengembalikan HTML SPA. |
| pass | ui.route./finance/cashflow | Route UI /finance/cashflow mengembalikan HTML SPA. |
| pass | ui.route./finance/proyek | Route UI /finance/proyek mengembalikan HTML SPA. |
| pass | ui.route./finance/kpp | Route UI /finance/kpp mengembalikan HTML SPA. |
| pass | ui.route./finance/hutang | Route UI /finance/hutang mengembalikan HTML SPA. |
| pass | ui.route./finance/piutang | Route UI /finance/piutang mengembalikan HTML SPA. |
| pass | ui.route./finance/rab | Route UI /finance/rab mengembalikan HTML SPA. |
| pass | ui.route./finance/profitabilitas | Route UI /finance/profitabilitas mengembalikan HTML SPA. |
| pass | ui.route./finance/forecast | Route UI /finance/forecast mengembalikan HTML SPA. |
| pass | ui.route./finance/accounting | Route UI /finance/accounting mengembalikan HTML SPA. |
| pass | ui.route./finance/audit | Route UI /finance/audit mengembalikan HTML SPA. |
| pass | ui.route./finance/warning | Route UI /finance/warning mengembalikan HTML SPA. |
| pass | ui.route./finance/ekspansi | Route UI /finance/ekspansi mengembalikan HTML SPA. |
