import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type AuthUser = {
  id: number;
  username: string;
  name: string;
  role: "super_admin" | "admin";
  allowedModules: string[];
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const updatedUser = { ...data, allowedModules: data.allowedModules ?? [] };
        setUser(updatedUser);
        localStorage.setItem("app_user", JSON.stringify(updatedUser));
      } else {
        setUser(null);
        localStorage.removeItem("app_user");
      }
    } catch {
      setUser(null);
      localStorage.removeItem("app_user");
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  async function login(username: string, password: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Login gagal");
    }
    const data = await res.json();
    const updatedUser = { ...data, allowedModules: data.allowedModules ?? [] };
    setUser(updatedUser);
    localStorage.setItem("app_user", JSON.stringify(updatedUser));
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // Suppress network error during logout, proceed to clear local state
    }
    setUser(null);
    localStorage.removeItem("app_user");
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus digunakan di dalam AuthProvider");
  return ctx;
}
