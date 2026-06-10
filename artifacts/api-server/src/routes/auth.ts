import { Router } from "express";
import { db } from "@workspace/db";
import { appUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const router = Router();

// ─── Ensure super admin exists ────────────────────────────────────────────────
async function ensureSuperAdmin() {
  try {
    const users = await db.select().from(appUsersTable).limit(1);
    if (users.length === 0) {
      const hash = await bcrypt.hash("satara123", 10);
      await db.insert(appUsersTable).values({
        username: "admin",
        name: "Super Admin",
        passwordHash: hash,
        role: "super_admin",
        allowedModules: [],
        isActive: true,
      });
      console.log("Default super admin created: admin / satara123");
    }
  } catch (e) {
    // table may not exist yet during initial migration
  }
}

ensureSuperAdmin();

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
router.get("/auth/me", async (req, res) => {
  const userId = (req.session as any)?.userId;
  if (!userId) { res.status(401).json({ error: "Belum login" }); return; }
  try {
    const [user] = await db.select({
      id: appUsersTable.id,
      username: appUsersTable.username,
      name: appUsersTable.name,
      role: appUsersTable.role,
      allowedModules: appUsersTable.allowedModules,
      isActive: appUsersTable.isActive,
    }).from(appUsersTable).where(eq(appUsersTable.id, userId));
    if (!user || !user.isActive) { (req.session as any).userId = null; res.status(401).json({ error: "Sesi tidak valid" }); return; }
    res.json(user);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────
router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) { res.status(400).json({ error: "Username dan password wajib diisi" }); return; }
  try {
    const [user] = await db.select().from(appUsersTable).where(eq(appUsersTable.username, username.trim().toLowerCase()));
    if (!user) { res.status(401).json({ error: "Username atau password salah" }); return; }
    if (!user.isActive) { res.status(401).json({ error: "Akun nonaktif, hubungi admin" }); return; }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) { res.status(401).json({ error: "Username atau password salah" }); return; }
    (req.session as any).userId = user.id;
    res.json({
      id: user.id, username: user.username, name: user.name,
      role: user.role, allowedModules: user.allowedModules,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────
router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => { res.json({ ok: true }); });
});

// ─── Middleware: require super_admin ──────────────────────────────────────────
async function requireSuperAdmin(req: any, res: any, next: any) {
  const userId = (req.session as any)?.userId;
  if (!userId) { res.status(401).json({ error: "Belum login" }); return; }
  const [user] = await db.select().from(appUsersTable).where(eq(appUsersTable.id, userId));
  if (!user || user.role !== "super_admin") { res.status(403).json({ error: "Hanya super admin" }); return; }
  next();
}

// ─── GET /auth/users ─────────────────────────────────────────────────────────
router.get("/auth/users", requireSuperAdmin, async (req, res) => {
  try {
    const users = await db.select({
      id: appUsersTable.id,
      username: appUsersTable.username,
      name: appUsersTable.name,
      role: appUsersTable.role,
      allowedModules: appUsersTable.allowedModules,
      isActive: appUsersTable.isActive,
      createdAt: appUsersTable.createdAt,
    }).from(appUsersTable).orderBy(appUsersTable.createdAt);
    res.json(users);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── POST /auth/users ─────────────────────────────────────────────────────────
router.post("/auth/users", requireSuperAdmin, async (req, res) => {
  try {
    const { username, name, password, role, allowedModules } = req.body;
    if (!username || !name || !password) { res.status(400).json({ error: "Username, nama, dan password wajib" }); return; }
    const hash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(appUsersTable).values({
      username: username.trim().toLowerCase(),
      name: name.trim(),
      passwordHash: hash,
      role: role || "admin",
      allowedModules: allowedModules ?? [],
      isActive: true,
    }).returning({
      id: appUsersTable.id, username: appUsersTable.username, name: appUsersTable.name,
      role: appUsersTable.role, allowedModules: appUsersTable.allowedModules, isActive: appUsersTable.isActive,
    });
    res.json(user);
  } catch (e: any) {
    if (e.message?.includes("unique")) res.status(409).json({ error: "Username sudah digunakan" });
    else res.status(500).json({ error: e.message });
  }
});

// ─── PUT /auth/users/:id ──────────────────────────────────────────────────────
router.put("/auth/users/:id", requireSuperAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, password, role, allowedModules, isActive } = req.body;
    const update: Record<string, any> = { updatedAt: new Date() };
    if (name) update.name = name.trim();
    if (role) update.role = role;
    if (allowedModules !== undefined) update.allowedModules = allowedModules;
    if (isActive !== undefined) update.isActive = isActive;
    if (password) update.passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.update(appUsersTable).set(update).where(eq(appUsersTable.id, id)).returning({
      id: appUsersTable.id, username: appUsersTable.username, name: appUsersTable.name,
      role: appUsersTable.role, allowedModules: appUsersTable.allowedModules, isActive: appUsersTable.isActive,
    });
    res.json(user);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE /auth/users/:id ───────────────────────────────────────────────────
router.delete("/auth/users/:id", requireSuperAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const currentUserId = (req.session as any)?.userId;
    if (id === currentUserId) { res.status(400).json({ error: "Tidak bisa menghapus akun sendiri" }); return; }
    await db.delete(appUsersTable).where(eq(appUsersTable.id, id));
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
