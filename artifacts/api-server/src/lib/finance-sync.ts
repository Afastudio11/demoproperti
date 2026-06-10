import {
  cashflowRecordsTable,
  db,
  financeAlertsTable,
  projectsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

type CashflowInput = {
  transactionDate?: string | null;
  type: "cash_in" | "cash_out";
  category: string;
  amount: number;
  description: string;
  referenceNumber?: string | null;
  projectId?: number | null;
  projectName?: string | null;
};

export async function resolveProjectName(projectId?: number | null, fallback?: string | null) {
  if (projectId) {
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
    if (project) return project.nama;
  }
  return fallback ?? "";
}

export async function recordFinanceCashflow(input: CashflowInput) {
  const amount = Math.abs(Number(input.amount) || 0);
  if (amount <= 0) return null;

  const projectName = await resolveProjectName(input.projectId, input.projectName);
  const [row] = await db.insert(cashflowRecordsTable).values({
    transactionDate: input.transactionDate || new Date().toISOString().slice(0, 10),
    type: input.type,
    category: input.category,
    projectName,
    amount: String(amount),
    description: input.description,
    referenceNumber: input.referenceNumber ?? null,
  }).returning();
  return row;
}

export async function createFinanceAlert(input: {
  alertType: string;
  level: "info" | "warning" | "kritis";
  message: string;
  amount?: number | null;
  relatedModule: string;
}) {
  const [row] = await db.insert(financeAlertsTable).values({
    alertType: input.alertType,
    level: input.level,
    message: input.message,
    amount: input.amount ? String(input.amount) : null,
    relatedModule: input.relatedModule,
  }).returning();
  return row;
}
