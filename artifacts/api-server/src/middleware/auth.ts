import type { NextFunction, Request, Response } from "express";
import { db } from "@workspace/db";
import { appUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type AuthenticatedUser = {
  id: number;
  username: string;
  name: string;
  role: string;
  allowedModules: string[];
  isActive: boolean;
};

declare global {
  namespace Express {
    interface Request {
      currentUser?: AuthenticatedUser;
    }
  }
}

const PUBLIC_API_PREFIXES = ["/healthz", "/auth/login", "/auth/logout", "/auth/me"];

const MODULE_PATH_RULES: Array<{ module: string; matches: (path: string) => boolean }> = [
  { module: "executive_overview", matches: (path) => path.startsWith("/teamwork") },
  { module: "projects", matches: (path) => path.startsWith("/projects") },
  { module: "akuisisi", matches: (path) => path.startsWith("/land-prospects") || path.startsWith("/ai/analyze-land") || path.startsWith("/ai/land-assessment") },
  { module: "perencanaan", matches: (path) => path.startsWith("/planning") || path.startsWith("/feasibility") || path.startsWith("/expansion") || path.startsWith("/ai/planning") || path.startsWith("/ai/expansion-roadmap") || path.startsWith("/ai/kabupaten-insight") || path.startsWith("/ai/slis-chat") },
  { module: "legal", matches: (path) => path.startsWith("/legal") },
  { module: "branding", matches: (path) => path.startsWith("/marketing/branding-kpi") },
  { module: "marketing", matches: (path) => path.startsWith("/marketing") || path.startsWith("/leads") },
  { module: "branding", matches: (path) => path.startsWith("/branding") },
  { module: "administrasi", matches: (path) => path.startsWith("/administrasi") || path.startsWith("/customers") },
  { module: "produksi", matches: (path) => path.startsWith("/produksi") || path.startsWith("/units") || path.startsWith("/construction") || path.startsWith("/qc") || path.startsWith("/materials") || path.startsWith("/handovers") },
  { module: "hr", matches: (path) => path.startsWith("/hr") },
  { module: "finance", matches: (path) => path.startsWith("/finance") || path.startsWith("/data-quality") },
];

function normalizeModules(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (PUBLIC_API_PREFIXES.some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`))) {
    return next();
  }

  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ error: "Belum login" });
  }

  try {
    const [user] = await db
      .select({
        id: appUsersTable.id,
        username: appUsersTable.username,
        name: appUsersTable.name,
        role: appUsersTable.role,
        allowedModules: appUsersTable.allowedModules,
        isActive: appUsersTable.isActive,
      })
      .from(appUsersTable)
      .where(eq(appUsersTable.id, userId));

    if (!user || !user.isActive) {
      req.session.userId = undefined;
      return res.status(401).json({ error: "Sesi tidak valid" });
    }

    req.currentUser = { ...user, allowedModules: normalizeModules(user.allowedModules) };
    return next();
  } catch (err) {
    req.log.error({ err }, "Failed to authenticate request");
    return res.status(500).json({ error: "Internal server error" });
  }
}

export function requireModuleAccess(req: Request, res: Response, next: NextFunction) {
  if (PUBLIC_API_PREFIXES.some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`))) {
    return next();
  }

  const user = req.currentUser;
  if (!user) {
    return res.status(401).json({ error: "Belum login" });
  }

  if (user.role === "super_admin") {
    return next();
  }

  // Shared category lists are used inside multiple modules; any logged-in user
  // may read/write their own module's categories through the UI.
  if (req.path.startsWith("/categories")) {
    return next();
  }

  const rule = MODULE_PATH_RULES.find((item) => item.matches(req.path));
  if (!rule) {
    return res.status(403).json({ error: "Akses modul belum dikonfigurasi" });
  }

  if (!user.allowedModules.includes(rule.module)) {
    return res.status(403).json({ error: `Tidak punya akses modul ${rule.module}` });
  }

  return next();
}
