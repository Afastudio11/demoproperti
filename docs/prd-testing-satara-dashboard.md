# PRD Testing Satara Internal Dashboard

## 1. Ringkasan

Dokumen ini mendefinisikan kebutuhan testing untuk Satara Internal Dashboard, terutama setelah perubahan sinkronisasi data antar modul dan perubahan URL utama dashboard dari `/executive` ke `/teamwork`.

Target utama testing adalah memastikan setiap data yang diinput di satu modul punya dampak yang jelas ke modul berikutnya, tidak tersimpan sebagai data manual yang terisolasi, dan tidak menampilkan angka dummy pada dashboard executive.

## 2. Tujuan Produk Testing

1. Memastikan user bisa login melalui `/teamwork` dan masuk ke dashboard executive.
2. Memastikan `/executive` otomatis redirect ke `/teamwork`.
3. Memastikan data master dipakai konsisten di frontend dan backend.
4. Memastikan data operasional yang memengaruhi finance, produksi, administrasi, marketing, dan HR tersinkron.
5. Memastikan dashboard executive memakai data aktual, bukan hardcoded/dummy.
6. Memastikan error handling jelas saat data tidak valid, stok tidak cukup, atau kontrak tidak sesuai.
7. Memastikan perubahan tidak merusak modul lama.

## 3. Scope Testing

### In Scope

- Login dan routing dashboard.
- Executive overview.
- Marketing lead ke administrasi customer.
- Administrasi pipeline customer.
- HT cair ke finance cashflow.
- Pembayaran subkon ke finance cashflow.
- Pembayaran KPP ke finance cashflow.
- Material masuk dan keluar.
- Kontrak subkon dan relasi unit/material/payment.
- HR absensi, lembur, masalah individu, dan culture sync.
- Data master project, employee, customer, unit, subkon, bank, material.
- Import finance cashflow.
- Build/typecheck frontend-backend.

### Out of Scope

- Performance/load test skala besar.
- Security penetration test mendalam.
- Testing integrasi payment gateway eksternal.
- Testing email/WhatsApp notification jika belum ada fitur produksi.
- Testing deployment cloud.

## 4. User Persona Testing

### Super Admin

- Bisa akses semua modul.
- Bisa melihat `/teamwork`.
- Bisa mengatur user dan akses modul.
- Bisa menguji semua flow lintas modul.

### Admin Modul

- Hanya bisa akses modul yang diberikan.
- Tidak boleh melihat modul yang tidak diizinkan.
- Jika akses ditolak, tampil halaman "Akses ditolak".

### Staff Operasional

- Input data sesuai modul masing-masing.
- Tidak perlu mengetik manual data yang sudah punya master.
- Harus memakai dropdown/master data.

## 5. Environment Testing

### Local

- Frontend: `http://localhost:5173`
- Main dashboard route: `http://localhost:5173/teamwork`
- Legacy route: `http://localhost:5173/executive`
- API base path: `/api`

### Kebutuhan Environment

- Database sudah menjalankan schema terbaru.
- Session cookie aktif.
- User test tersedia.
- Data master minimal tersedia:
  - 1 project aktif
  - 2 unit
  - 1 customer
  - 1 subkon contract
  - 1 employee
  - 1 material master
  - 1 bank

## 6. Data Master Minimal Untuk QA

### Project

- Nama: Project QA Satara
- Status: active
- Fase: PRODUCTION

### Unit

- Unit 1: Blok A, Nomor 01, Stage T1, linked ke project
- Unit 2: Blok A, Nomor 02, Stage T1, linked ke project

### Subkon

- Nama subkon: Subkon QA
- Project: Project QA Satara
- Stage: T1
- Unit count: 2
- Value per unit: 10000000
- Retention per unit: 500000

### Employee

- Nama: QA Staff
- Divisi: Produksi
- Posisi: Staff Lapangan
- Status: aktif

### Material

- Nama: Semen QA
- Satuan: zak
- Standard per unit: 10
- Minimum stock: 5

### Customer

- Nama: Customer QA
- Unit: A-01
- Payment type: KPR
- Pipeline: MINAT

## 7. Functional Requirements

### FR-001 Login via `/teamwork`

User yang membuka `/teamwork` tanpa session harus melihat halaman login.

Acceptance Criteria:

- [ ] URL tetap `/teamwork`.
- [ ] Form login tampil.
- [ ] Setelah login sukses, user melihat dashboard executive.
- [ ] Tidak ada console error.

### FR-002 Redirect `/executive` ke `/teamwork`

Route lama `/executive` harus otomatis mengarah ke `/teamwork`.

Acceptance Criteria:

- [ ] Buka `/executive`.
- [ ] Browser pindah ke `/teamwork`.
- [ ] Jika belum login, form login tampil di `/teamwork`.
- [ ] Jika sudah login, dashboard executive tampil di `/teamwork`.

### FR-003 Landing CTA ke `/teamwork`

Semua tombol "Masuk" dan "Dashboard" di landing page harus menuju `/teamwork`.

Acceptance Criteria:

- [ ] CTA desktop menuju `/teamwork`.
- [ ] CTA mobile menuju `/teamwork`.
- [ ] Tidak ada link landing yang masih menuju `/executive`.

### FR-004 Marketing Lead Sync ke Customer

Lead dengan status `BERKAS_LENGKAP` atau `DISERAHKAN_ADMIN` harus membuat customer master jika belum ada.

Acceptance Criteria:

- [ ] Buat lead baru dengan project, nama, kontak.
- [ ] Ubah status menjadi `DISERAHKAN_ADMIN`.
- [ ] Customer baru muncul di administrasi.
- [ ] Customer memiliki project yang sama.
- [ ] Customer memiliki phone/kontak dari lead.
- [ ] Customer status history terisi.
- [ ] Duplicate customer tidak dibuat jika nama/kontak sudah ada.

### FR-005 Administrasi Pipeline Sync

Input pada submodul administrasi harus mengubah pipeline customer.

Acceptance Criteria:

- [ ] Bank submission mengubah customer ke `SETOR_BANK`.
- [ ] OTS mengubah customer ke `OTS`.
- [ ] OTS result revisi mengubah customer ke `REVISI`.
- [ ] SP3K approved mengubah customer ke `SP3K`.
- [ ] Akad selesai mengubah customer ke `AKAD`.
- [ ] HT cair mengubah customer ke `HT_CAIR`.
- [ ] Semua perubahan status masuk history.

### FR-006 HT Cair Sync ke Finance

HT cair harus membuat cashflow finance.

Acceptance Criteria:

- [ ] Input HT dengan nilai lebih dari 0.
- [ ] Finance cashflow bertambah.
- [ ] Type cashflow adalah `cash_in`.
- [ ] Category adalah `ht`.
- [ ] Reference number memakai format `HT-{id}`.
- [ ] Project mengikuti project customer.

### FR-007 Pembayaran Subkon Sync ke Finance

Termin subkon yang sudah approved dan ditandai paid harus masuk cashflow.

Acceptance Criteria:

- [ ] Termin baru hanya bisa dibuat jika progress lapangan naik.
- [ ] Payment harus approved sebelum mark paid.
- [ ] Setelah mark paid, finance cashflow bertambah.
- [ ] Type cashflow adalah `cash_out`.
- [ ] Category adalah `subkon`.
- [ ] Reference number memakai format `SUBKON-{contractId}-{paymentId}`.

### FR-008 Pembayaran KPP Sync ke Finance

Pembayaran KPP harus membuat cashflow finance.

Acceptance Criteria:

- [ ] Input pembayaran principal/interest.
- [ ] Finance cashflow bertambah.
- [ ] Type cashflow adalah `cash_out`.
- [ ] Category adalah `kpp`.
- [ ] Project name mengikuti KPP facility.

### FR-009 Material Masuk Context

Material masuk harus bisa terkait project, stage, unit, kontrak, dan subkon.

Acceptance Criteria:

- [ ] Form material masuk memakai project master.
- [ ] Form material masuk bisa pilih unit.
- [ ] Saat unit dipilih, stage ikut terisi.
- [ ] Form bisa memilih kontrak subkon.
- [ ] Data tersimpan dengan `projectId`, `unitId`, `contractId`, `stageCode`, `subkonName`.
- [ ] Tabel list menampilkan unit/kontrak.

### FR-010 Material Keluar Stock Guard

Material keluar tidak boleh melebihi stok scoped project/stage/material.

Acceptance Criteria:

- [ ] Jika stok tersedia 10, request keluar 5 berhasil.
- [ ] Jika stok tersedia 10, request keluar 11 ditolak.
- [ ] Response error menampilkan stok tersedia dan request quantity.
- [ ] Stok aktual berkurang setelah material keluar valid.

### FR-011 Kontrak Subkon Delete Guard

Kontrak subkon tidak boleh dihapus jika sudah dipakai.

Acceptance Criteria:

- [ ] Kontrak tanpa penggunaan bisa dihapus.
- [ ] Kontrak yang sudah dipakai unit tidak bisa dihapus.
- [ ] Kontrak yang sudah dipakai material keluar tidak bisa dihapus.
- [ ] Kontrak yang sudah punya payment tidak bisa dihapus.
- [ ] Error response menjelaskan usage count.

### FR-012 Kontrak Subkon Recalculation

Perubahan unit count, value per unit, atau retention harus menghitung ulang nilai kontrak.

Acceptance Criteria:

- [ ] Update unit count mengubah contract value.
- [ ] Update value per unit mengubah contract value.
- [ ] Update retention per unit mengubah total retention.
- [ ] Net payable value = contract value - total retention.

### FR-013 QC Ready Akad

Unit tidak boleh ready akad jika belum punya QC item.

Acceptance Criteria:

- [ ] Unit progress 100 persen tanpa QC tidak ready akad.
- [ ] Unit progress 100 persen dengan QC score di bawah 90 tidak ready akad.
- [ ] Unit progress 100 persen, tidak ada defect/rework open, QC score minimal 90 menjadi ready akad.

### FR-014 Executive Dashboard Data Aktual

Executive overview harus memakai data aktual dari modul.

Acceptance Criteria:

- [ ] Cashflow chart berasal dari finance cashflow records.
- [ ] Total income/outcome berubah setelah HT/subkon/KPP sync.
- [ ] Alert stok memakai material master/in/out produksi.
- [ ] Tidak ada cashflow dummy hardcoded.
- [ ] Risk & eskalasi tampil berdasarkan data aktual.

### FR-015 Finance Import Cashflow Type Inference

Import cashflow tidak boleh default semua ke `cash_in`.

Acceptance Criteria:

- [ ] Nominal negatif menjadi `cash_out`.
- [ ] Kolom type `debit/keluar/pengeluaran` menjadi `cash_out`.
- [ ] Kolom type `credit/masuk/pendapatan` menjadi `cash_in`.
- [ ] Amount disimpan positif.

### FR-016 Finance Upload Delete Cascade

Delete upload finance harus menghapus child records terkait.

Acceptance Criteria:

- [ ] Delete upload cashflow menghapus cashflow records upload tersebut.
- [ ] Delete upload hutang menghapus debt records upload tersebut.
- [ ] Delete upload piutang menghapus receivable records upload tersebut.
- [ ] Delete upload RAB menghapus RAB items upload tersebut.

### FR-017 HR Attendance Master Sync

Absensi harus memakai employee master dan project master.

Acceptance Criteria:

- [ ] Dropdown karyawan berasal dari `/api/hr/employees`.
- [ ] Dropdown project berasal dari `/api/projects`.
- [ ] Save mengirim `employeeId` dan `projectId`.
- [ ] Backend tetap menyimpan employeeName dan project sebagai fallback display.

### FR-018 HR Attendance Culture Sync

Absensi harus memperbarui culture record bulanan.

Acceptance Criteria:

- [ ] Input status `H` menambah days present.
- [ ] Input status `L` dihitung hadir.
- [ ] Month string seperti `JANUARI` terbaca sebagai bulan 1.
- [ ] Culture record dibuat jika belum ada.
- [ ] Culture record diupdate jika sudah ada.

### FR-019 HR Overtime Master Sync

Lembur dan keterlambatan harus memakai employee/project master.

Acceptance Criteria:

- [ ] Bulk lembur mengirim `employeeId` dan `projectId`.
- [ ] Filter project memakai `projectId`.
- [ ] List data tetap menampilkan nama employee dan project.

### FR-020 HR Individual Issue Master Sync

Masalah individu harus memakai employee/project master.

Acceptance Criteria:

- [ ] Form masalah individu memilih karyawan dari employee master.
- [ ] Form memilih project dari project master.
- [ ] Divisi otomatis mengikuti employee jika tersedia.
- [ ] Save mengirim `projectId`.
- [ ] Filter project memakai `projectId`.

### FR-021 Customer Form Unit Master

Customer new/edit harus memilih unit master, bukan mengetik blok/tahap manual.

Acceptance Criteria:

- [ ] Project dipilih dari project master.
- [ ] Unit dropdown difilter berdasarkan project.
- [ ] Saat unit dipilih, `unitId`, `projectId`, `stageCode`, `unitBlock`, `unitPrice` terisi.
- [ ] Stage dan unit block menjadi read only.

### FR-022 Expansion Readiness Endpoint

Halaman readiness ekspansi tidak boleh request endpoint mati.

Acceptance Criteria:

- [ ] Query memakai `/api/planning/expansion`.
- [ ] Jika data kosong, halaman tetap render.
- [ ] Skor pasar memakai data expansion jika ada.

## 8. Negative Test Scenarios

### NT-001 Login Gagal

- Input username salah.
- Input password salah.
- Expected: error tampil, user tetap di `/teamwork`.

### NT-002 Akses Modul Ditolak

- Login user tanpa akses finance.
- Buka `/finance`.
- Expected: halaman akses ditolak.

### NT-003 Material Keluar Tanpa Stok

- Buat material keluar tanpa material masuk.
- Expected: request ditolak.

### NT-004 Material Unit Tidak Sesuai Project

- Pilih project A tapi unit dari project B.
- Expected: request ditolak.

### NT-005 Subkon Tanpa Kontrak Aktif

- Input material keluar dengan subkon yang tidak punya kontrak aktif.
- Expected: request ditolak dengan pesan kontrak belum ada.

### NT-006 Duplicate Lead ke Customer

- Buat dua lead dengan kontak yang sama dan status `DISERAHKAN_ADMIN`.
- Expected: hanya satu customer dibuat.

### NT-007 Delete Kontrak Dipakai

- Kontrak sudah punya unit/payment/material.
- Expected: delete ditolak status 409.

### NT-008 HT Amount Nol

- Input HT dengan amount 0.
- Expected: customer boleh update jika valid, tetapi cashflow tidak dibuat.

## 9. Regression Checklist

- [ ] Landing page tetap render.
- [ ] Login tetap berjalan.
- [ ] Logout tetap berjalan.
- [ ] Settings user tetap berjalan.
- [ ] Sidebar active state benar di `/teamwork`.
- [ ] Project list tetap render.
- [ ] Marketing dashboard tetap render.
- [ ] Administrasi customer list/detail tetap render.
- [ ] Produksi dashboard tetap render.
- [ ] Material stock tetap render.
- [ ] Finance dashboard tetap render.
- [ ] HR dashboard tetap render.
- [ ] Build frontend sukses.
- [ ] Build backend sukses.
- [ ] Typecheck sukses.
- [ ] Tidak ada console error di halaman utama.

## 10. Test Matrix

| Area | Test Type | Priority | Automation Candidate |
| --- | --- | --- | --- |
| Login `/teamwork` | Functional | P0 | Yes |
| Redirect `/executive` | Functional | P0 | Yes |
| Marketing to customer | Integration | P0 | Yes |
| Admin pipeline | Integration | P0 | Yes |
| HT to finance | Integration | P0 | Yes |
| Subkon payment to finance | Integration | P0 | Yes |
| KPP payment to finance | Integration | P1 | Yes |
| Material stock guard | Integration | P0 | Yes |
| HR attendance culture sync | Integration | P1 | Yes |
| Customer unit master | UI Functional | P1 | Partial |
| Executive actual data | E2E | P0 | Partial |
| Finance import inference | Unit/Integration | P1 | Yes |

## 11. Suggested Automated Tests

### API Integration Tests

1. `POST /api/marketing/leads` with status `DISERAHKAN_ADMIN` creates customer.
2. `POST /api/administrasi/ht` creates finance cashflow.
3. `PATCH /api/produksi/subkon/payments/:id/mark-paid` creates finance cashflow.
4. `POST /api/produksi/material/out` rejects quantity greater than available stock.
5. `POST /api/hr/attendance/bulk` creates or updates culture record.

### Frontend Smoke Tests

1. Open `/teamwork`.
2. Open `/executive` and expect `/teamwork`.
3. Login with valid user.
4. Ensure dashboard shell renders.
5. Ensure sidebar Executive Overview points to `/teamwork`.

## 12. Release Gate

Release boleh dilanjutkan jika:

- [ ] P0 test cases pass 100 persen.
- [ ] Tidak ada blocker di login/routing.
- [ ] Tidak ada data sync utama yang gagal.
- [ ] Typecheck sukses.
- [ ] Frontend build sukses.
- [ ] Backend build sukses.
- [ ] Database schema sudah dipush ke environment target.

## 13. Known Risks

1. Database target harus sudah punya kolom baru untuk sync HR dan material.
2. Jika `DATABASE_URL` tidak tersedia, migration/push schema tidak bisa dijalankan dari local shell.
3. Data historis yang sebelumnya manual mungkin perlu backfill agar report lama konsisten.
4. Beberapa flow lintas modul bergantung pada status string yang harus konsisten.

## 14. Open Questions

1. Apakah `/executive` akan dihapus total nanti, atau tetap dipertahankan sebagai redirect permanen?
2. Apakah user non-super-admin boleh selalu akses `/teamwork`, atau tetap berdasarkan module `executive_overview`?
3. Apakah HT cair perlu membuat receivable/payment record tambahan selain cashflow?
4. Apakah material masuk harus wajib terkait kontrak, atau opsional tetap diperbolehkan untuk stok gudang umum?
5. Apakah kultur HR harus menghitung keterlambatan dari modul lembur juga, bukan hanya attendance status?
