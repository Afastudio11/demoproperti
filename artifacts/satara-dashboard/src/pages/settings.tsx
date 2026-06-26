import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  Users, Plus, Trash2, Pencil, Check, X, KeyRound, Shield, ShieldCheck, Eye, EyeOff, Loader2,
} from "lucide-react";
import { useConfirm } from "@/contexts/confirmation-context";

const ALL_MODULES = [
  { key: "executive_overview", label: "Executive Overview" },
  { key: "akuisisi", label: "Akuisisi Lahan" },
  { key: "perencanaan", label: "Perencanaan" },
  { key: "projects", label: "Daftar Proyek" },
  { key: "legal", label: "Legal & Perizinan" },
  { key: "marketing", label: "Marketing" },
  { key: "administrasi", label: "Administrasi KPR" },
  { key: "produksi", label: "Produksi" },
  { key: "finance", label: "Finance & Accounting" },
  { key: "branding", label: "Branding" },
  { key: "hr", label: "Human Resource" },
  { key: "serah_terima", label: "Serah Terima" },
  { key: "slis", label: "SLIS" },
  { key: "settings", label: "Settings" },
];

type AppUser = {
  id: number;
  username: string;
  name: string;
  role: string;
  allowedModules: string[];
  isActive: boolean;
  createdAt: string;
};

const EMPTY_FORM = { username: "", name: "", password: "", role: "admin", allowedModules: [] as string[], isActive: true };

export default function Settings() {
  const confirm = useConfirm();
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const isSuperAdmin = currentUser?.role === "super_admin";

  const [editId, setEditId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState<typeof EMPTY_FORM & { id: number } | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [showEditPass, setShowEditPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { data: users = [], isLoading } = useQuery<AppUser[]>({
    queryKey: ["auth-users"],
    queryFn: () => fetch("/api/auth/users", { credentials: "include" }).then(r => r.json()),
    enabled: isSuperAdmin,
  });

  const createMut = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) =>
      fetch("/api/auth/users", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async r => { if (!r.ok) throw new Error((await r.json()).error); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["auth-users"] }); setShowAddForm(false); setForm(EMPTY_FORM); setErrorMsg(""); },
    onError: (e: any) => setErrorMsg(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }: typeof EMPTY_FORM & { id: number }) =>
      fetch(`/api/auth/users/${id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async r => { if (!r.ok) throw new Error((await r.json()).error); return r.json(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["auth-users"] }); setEditId(null); setEditForm(null); setErrorMsg(""); },
    onError: (e: any) => setErrorMsg(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/auth/users/${id}`, { method: "DELETE", credentials: "include" })
        .then(async r => { if (!r.ok) throw new Error((await r.json()).error); return r.json(); }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auth-users"] }),
    onError: (e: any) => setErrorMsg(e.message),
  });

  function startEdit(u: AppUser) {
    setEditId(u.id);
    setEditForm({ id: u.id, username: u.username, name: u.name, password: "", role: u.role, allowedModules: u.allowedModules ?? [], isActive: u.isActive });
    setErrorMsg("");
  }

  function toggleModule(mods: string[], key: string): string[] {
    return mods.includes(key) ? mods.filter(m => m !== key) : [...mods, key];
  }

  function fmtDate(s: string) {
    return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Pengaturan</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Kelola akun pengguna dan hak akses menu</p>
      </div>

      {/* Current user info */}
      <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-semibold text-sm shrink-0">
          {currentUser?.name?.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">{currentUser?.name}</div>
          <div className="text-xs text-muted-foreground">@{currentUser?.username}</div>
        </div>
        <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full",
          currentUser?.role === "super_admin"
            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
            : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300")}>
          {currentUser?.role === "super_admin" ? "Super Admin" : "Admin"}
        </span>
      </div>

      {/* User management — super admin only */}
      {isSuperAdmin && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Manajemen Pengguna</h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{users.length} akun</span>
            </div>
            <button onClick={() => { setShowAddForm(!showAddForm); setErrorMsg(""); }}
              className="flex items-center gap-1.5 text-xs bg-foreground text-background px-3 py-1.5 rounded-md hover:opacity-90">
              <Plus className="size-3.5" />Tambah Pengguna
            </button>
          </div>

          {/* Add user form */}
          {showAddForm && (
            <div className="rounded-xl border bg-card p-4 space-y-4">
              <div className="text-sm font-semibold">Tambah Pengguna Baru</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Nama Lengkap</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nama lengkap" className="w-full text-sm px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Username</label>
                  <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase() }))}
                    placeholder="username" className="w-full text-sm px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Password</label>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Password" className="w-full text-sm px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring pr-9" />
                    <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                      {showPass ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Role</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full text-sm px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>

              {form.role === "admin" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">Akses Menu</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                    {ALL_MODULES.map(m => (
                      <button key={m.key} type="button"
                        onClick={() => setForm(f => ({ ...f, allowedModules: toggleModule(f.allowedModules, m.key) }))}
                        className={cn("text-left text-xs px-2.5 py-1.5 rounded border transition-all", form.allowedModules.includes(m.key) ? "border-foreground bg-foreground/5 font-medium" : "border-border hover:bg-muted/40")}>
                        <div className="flex items-center gap-1.5">
                          {form.allowedModules.includes(m.key) ? <Check className="size-3 shrink-0" /> : <div className="size-3 shrink-0" />}
                          {m.label}
                        </div>
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => setForm(f => ({ ...f, allowedModules: ALL_MODULES.map(m => m.key) }))}
                    className="mt-2 text-xs text-muted-foreground hover:text-foreground underline">Pilih semua</button>
                  <span className="mx-2 text-muted-foreground/40 text-xs">·</span>
                  <button type="button" onClick={() => setForm(f => ({ ...f, allowedModules: [] }))}
                    className="text-xs text-muted-foreground hover:text-foreground underline">Hapus semua</button>
                </div>
              )}

              {errorMsg && <div className="text-xs text-red-600 dark:text-red-400">{errorMsg}</div>}

              <div className="flex gap-2">
                <button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.name || !form.username || !form.password}
                  className="text-sm bg-foreground text-background px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                  {createMut.isPending && <Loader2 className="size-3.5 animate-spin" />} Simpan
                </button>
                <button onClick={() => { setShowAddForm(false); setForm(EMPTY_FORM); setErrorMsg(""); }}
                  className="text-sm border px-4 py-2 rounded-md hover:bg-muted">Batal</button>
              </div>
            </div>
          )}

          {/* User list */}
          <div className="rounded-xl border bg-card overflow-hidden">
            {isLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                    <th className="text-left px-4 py-2.5 font-medium">Pengguna</th>
                    <th className="text-left px-3 py-2.5 font-medium">Role</th>
                    <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Akses Menu</th>
                    <th className="text-center px-3 py-2.5 font-medium w-20">Status</th>
                    <th className="px-3 py-2.5 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20">
                      {editId === u.id && editForm ? (
                        <td colSpan={5} className="px-4 py-4">
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-muted-foreground block mb-1">Nama</label>
                                <input value={editForm.name} onChange={e => setEditForm(f => f ? { ...f, name: e.target.value } : f)}
                                  className="w-full text-sm px-3 py-1.5 border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground block mb-1">Password Baru (kosongkan = tidak ubah)</label>
                                <div className="relative">
                                  <input type={showEditPass ? "text" : "password"} value={editForm.password} onChange={e => setEditForm(f => f ? { ...f, password: e.target.value } : f)}
                                    placeholder="Password baru..." className="w-full text-sm px-3 py-1.5 border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring pr-9" />
                                  <button type="button" onClick={() => setShowEditPass(p => !p)} className="absolute right-2.5 top-2 text-muted-foreground">
                                    {showEditPass ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground block mb-1">Role</label>
                                <select value={editForm.role} onChange={e => setEditForm(f => f ? { ...f, role: e.target.value } : f)}
                                  className="w-full text-sm px-3 py-1.5 border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                                  <option value="admin">Admin</option>
                                  <option value="super_admin">Super Admin</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground block mb-1">Status</label>
                                <select value={String(editForm.isActive)} onChange={e => setEditForm(f => f ? { ...f, isActive: e.target.value === "true" } : f)}
                                  className="w-full text-sm px-3 py-1.5 border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                                  <option value="true">Aktif</option>
                                  <option value="false">Nonaktif</option>
                                </select>
                              </div>
                            </div>
                            {editForm.role === "admin" && (
                              <div>
                                <label className="text-xs text-muted-foreground block mb-2">Akses Menu</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                                  {ALL_MODULES.map(m => (
                                    <button key={m.key} type="button"
                                      onClick={() => setEditForm(f => f ? { ...f, allowedModules: toggleModule(f.allowedModules, m.key) } : f)}
                                      className={cn("text-left text-xs px-2.5 py-1.5 rounded border transition-all",
                                        editForm.allowedModules.includes(m.key) ? "border-foreground bg-foreground/5 font-medium" : "border-border hover:bg-muted/40")}>
                                      <div className="flex items-center gap-1.5">
                                        {editForm.allowedModules.includes(m.key) ? <Check className="size-3 shrink-0" /> : <div className="size-3 shrink-0" />}
                                        {m.label}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                                <button type="button" onClick={() => setEditForm(f => f ? { ...f, allowedModules: ALL_MODULES.map(m => m.key) } : f)}
                                  className="mt-2 text-xs text-muted-foreground hover:text-foreground underline">Pilih semua</button>
                                <span className="mx-2 text-muted-foreground/40 text-xs">·</span>
                                <button type="button" onClick={() => setEditForm(f => f ? { ...f, allowedModules: [] } : f)}
                                  className="text-xs text-muted-foreground hover:text-foreground underline">Hapus semua</button>
                              </div>
                            )}
                            {errorMsg && <div className="text-xs text-red-600 dark:text-red-400">{errorMsg}</div>}
                            <div className="flex gap-2">
                              <button onClick={() => updateMut.mutate(editForm)} disabled={updateMut.isPending}
                                className="text-xs bg-foreground text-background px-3 py-1.5 rounded-md hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5">
                                {updateMut.isPending && <Loader2 className="size-3 animate-spin" />}<Check className="size-3" />Simpan
                              </button>
                              <button onClick={() => { setEditId(null); setEditForm(null); setErrorMsg(""); }}
                                className="text-xs border px-3 py-1.5 rounded-md hover:bg-muted flex items-center gap-1.5">
                                <X className="size-3" />Batal
                              </button>
                            </div>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                                {u.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-sm font-medium">{u.name}</div>
                                <div className="text-xs text-muted-foreground">@{u.username}</div>
                              </div>
                              {u.id === currentUser?.id && (
                                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Anda</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium",
                              u.role === "super_admin"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300")}>
                              {u.role === "super_admin" ? <ShieldCheck className="size-3" /> : <Shield className="size-3" />}
                              {u.role === "super_admin" ? "Super Admin" : "Admin"}
                            </span>
                          </td>
                          <td className="px-3 py-3 hidden md:table-cell">
                            {u.role === "super_admin" ? (
                              <span className="text-xs text-muted-foreground">Akses penuh</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {u.allowedModules?.length ? `${u.allowedModules.length} modul` : "Belum ada akses"}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                              u.isActive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400")}>
                              {u.isActive ? "Aktif" : "Nonaktif"}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => startEdit(u)}
                                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Edit">
                                <Pencil className="size-3.5" />
                              </button>
                              <button onClick={async () => {
                                const ok = await confirm({
                                  title: "Hapus Pengguna",
                                  description: `Apakah Anda yakin ingin menghapus pengguna "${u.name}"?`,
                                  confirmText: "Hapus",
                                  cancelText: "Batal",
                                  variant: "destructive",
                                });
                                if (ok) {
                                  deleteMut.mutate(u.id);
                                }
                              }}
                                disabled={u.id === currentUser?.id || deleteMut.isPending}
                                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-red-500 disabled:opacity-30" title="Hapus">
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 border">
            <KeyRound className="size-3.5 shrink-0 mt-0.5" />
            <span>Super Admin memiliki akses ke semua modul. Admin hanya bisa mengakses modul yang dicentang di sini. Akun super admin awal harus dibuat melalui environment bootstrap server.</span>
          </div>
        </div>
      )}

      {/* Non-super-admin: info only */}
      {!isSuperAdmin && (
        <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          <Shield className="size-8 mx-auto mb-3 opacity-30" />
          <p>Pengaturan pengguna hanya dapat diakses oleh Super Admin.</p>
        </div>
      )}
    </div>
  );
}
