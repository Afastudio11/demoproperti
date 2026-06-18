import { db } from "@workspace/db";
import {
  projectsTable,
  subkonContractsTable,
  subkonPaymentTermsTable,
  subkonPaymentsTable,
  paymentApprovalsTable,
} from "@workspace/db";

async function main() {
  console.log("=== Memulai Input Contoh Approval Pembayaran Subkon ===\n");

  // 1. Dapatkan atau buat project
  let [project] = await db.select().from(projectsTable).limit(1);
  if (!project) {
    console.log("Proyek tidak ditemukan, membuat proyek baru...");
    [project] = await db.insert(projectsTable).values({
      nama: "Proyek Perumahan Indah",
      lokasi: "Gowa",
      provinsi: "Sulawesi Selatan",
      kabupaten: "Gowa",
      kecamatan: "Somba Opu",
      desa: "Paccinongang",
      luas: 10000,
      totalUnit: 50,
      fase: "KONSTRUKSI",
      status: "active",
    }).returning();
  }
  console.log(`[+] Menggunakan Proyek: ID ${project.id} - ${project.nama}`);

  // 2. Buat Kontrak Subkon
  const subkonName = "PT Bangun Rekayasa Nusantara";
  const [contract] = await db.insert(subkonContractsTable).values({
    projectId: project.id,
    stageCode: "STR", // Struktur
    subkonId: 1, // Hubungkan ke master subkon ID 1 (atau dummy)
    subkonName,
    unitCount: 5,
    valuePerUnit: 12000000, // Rp 12.000.000 per unit
    contractValue: 60000000, // Rp 60.000.000 total
    retentionPerUnit: 600000, // 5% retensi per unit (Rp 600.000)
    totalRetention: 3000000, // Rp 3.000.000 total retensi
    netPayableValue: 57000000, // Rp 57.000.000 total pembayaran bersih
    maintenanceMonths: 3,
    startDate: "2026-06-01",
    targetEndDate: "2026-08-31",
    retentionStatus: "ditahan",
    status: "aktif",
  }).returning();
  console.log(`[+] Kontrak Subkon dibuat: ID ${contract.id} - ${contract.subkonName}`);

  // 3. Buat Payment Term
  const [paymentTerm] = await db.insert(subkonPaymentTermsTable).values({
    contractId: contract.id,
    terminNumber: 1,
    label: "Termin 1 (Progress 20%)",
    plannedDate: "2026-06-30",
    paymentType: "termin",
    grossAmount: 12000000, // Rp 12.000.000 gross
    retentionAmount: 600000, // Rp 600.000 retensi
    netAmount: 11400000, // Rp 11.400.000 bersih
    notes: "Pembayaran termin 1 setelah progress struktur mencapai 20%",
  }).returning();
  console.log(`[+] Jadwal Payment Term dibuat: ID ${paymentTerm.id} - ${paymentTerm.label}`);

  // 4. Buat Pembayaran Subkon (Subkon Payment) dengan status pending_approval
  const [payment] = await db.insert(subkonPaymentsTable).values({
    contractId: contract.id,
    paymentTermId: paymentTerm.id,
    paymentType: "termin",
    terminNumber: 1,
    period: "2026-06",
    progressPrevious: 0,
    progressCurrent: 20,
    velocity: 20,
    grossEligibleAmount: 12000000,
    retentionDeducted: 600000,
    netPayment: 11400000,
    totalPaidBefore: 0,
    status: "pending_approval",
    notes: "Pengajuan pembayaran termin 1 PT Bangun Rekayasa Nusantara",
  }).returning();
  console.log(`[+] Pengajuan Pembayaran Subkon dibuat: ID ${payment.id} (Status: ${payment.status})`);

  // 5. Buat Approval Record
  const [approval] = await db.insert(paymentApprovalsTable).values({
    paymentId: payment.id,
    step: "finance",
    status: "pending",
    notes: "Perlu approval finance untuk pembayaran termin 1",
  }).returning();
  console.log(`[+] Record Approval dibuat: ID ${approval.id} (Step: ${approval.step}, Status: ${approval.status})`);

  console.log("\n[✓] Berhasil menginput data contoh approval pembayaran subkon!");
  process.exit(0);
}

main().catch(err => {
  console.error("[-] Gagal menginput contoh data:", err);
  process.exit(1);
});
