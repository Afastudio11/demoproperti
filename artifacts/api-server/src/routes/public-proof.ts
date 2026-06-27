import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  subkonPaymentsTable,
  subkonContractsTable,
  projectsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function decodePaymentToken(token: string) {
  try {
    const text = Buffer.from(token, "base64url").toString("utf8");
    const [kind, rawId] = text.split(":");
    const paymentId = Number(rawId);
    if (kind !== "subkon-payment" || !Number.isFinite(paymentId)) return null;
    return paymentId;
  } catch {
    return null;
  }
}

router.get("/public/payment-proof/:token", async (req, res) => {
  try {
    const paymentId = decodePaymentToken(req.params.token);
    if (!paymentId) return res.status(400).json({ error: "Token bukti bayar tidak valid" });

    const [payment] = await db.select().from(subkonPaymentsTable).where(eq(subkonPaymentsTable.id, paymentId));
    if (!payment) return res.status(404).json({ error: "Bukti pembayaran tidak ditemukan" });

    const [contract] = await db.select().from(subkonContractsTable).where(eq(subkonContractsTable.id, payment.contractId));
    const [project] = contract
      ? await db.select().from(projectsTable).where(eq(projectsTable.id, contract.projectId))
      : [];

    const docId = `SPK-${String(contract?.id ?? 0).padStart(4, "0")}-P${String(payment.id).padStart(5, "0")}`;
    const isPaid = payment.status === "paid" || payment.status === "approved";

    res.json({
      verified: isPaid,
      status: payment.status,
      docId,
      paymentId: payment.id,
      projectName: project?.nama ?? `Proyek ${contract?.projectId ?? "-"}`,
      subkonName: contract?.subkonName ?? "-",
      stageCode: contract?.stageCode ?? null,
      paymentType: payment.paymentType,
      amount: payment.netPayment ?? 0,
      paymentDate: payment.paymentDate,
      progressPrevious: payment.progressPrevious,
      progressCurrent: payment.progressCurrent,
      notes: payment.notes,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to read public payment proof");
    res.status(500).json({ error: "Gagal membuka bukti pembayaran" });
  }
});

export default router;
