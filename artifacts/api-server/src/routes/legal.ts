import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { legalDocumentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateLegalDocumentBody, UpdateLegalDocumentBody } from "@workspace/api-zod";

const BANKABLE_DOCS = ["SHM", "bank_ready", "sikumbang", "PBG"];

const router: IRouter = Router();

router.get("/legal", async (req, res) => {
  try {
    let docs = await db.select().from(legalDocumentsTable);
    if (req.query.projectId) {
      const pid = parseInt(req.query.projectId as string);
      docs = docs.filter(d => d.projectId === pid);
    }
    res.json(docs.map(d => ({ ...d, pic: d.pic ?? null, expiry: d.expiry ?? null, catatan: d.catatan ?? null, createdAt: d.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list legal documents");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/legal", async (req, res) => {
  try {
    const body = CreateLegalDocumentBody.parse(req.body);
    const [doc] = await db.insert(legalDocumentsTable).values(body).returning();
    res.status(201).json({ ...doc, pic: doc.pic ?? null, expiry: doc.expiry ?? null, catatan: doc.catatan ?? null, createdAt: doc.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create legal document");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.patch("/legal/:id", async (req, res) => {
  try {
    const body = UpdateLegalDocumentBody.parse(req.body);
    const [doc] = await db.update(legalDocumentsTable).set(body).where(eq(legalDocumentsTable.id, parseInt(req.params.id))).returning();
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ ...doc, pic: doc.pic ?? null, expiry: doc.expiry ?? null, catatan: doc.catatan ?? null, createdAt: doc.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update legal document");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.get("/legal/bankable-gate/:projectId", async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const docs = await db.select().from(legalDocumentsTable).where(eq(legalDocumentsTable.projectId, projectId));

    const checks = BANKABLE_DOCS.map(docType => {
      const doc = docs.find(d => d.tipeDokumen === docType);
      return {
        name: docType,
        status: !doc ? "red" : doc.status === "approved" ? "green" : doc.status === "in_progress" ? "yellow" : "red",
        notes: doc?.catatan ?? null,
      };
    });

    const isBankable = checks.every(c => c.status === "green");
    res.json({ projectId, isBankable, checks });
  } catch (err) {
    req.log.error({ err }, "Failed to get bankable gate");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
