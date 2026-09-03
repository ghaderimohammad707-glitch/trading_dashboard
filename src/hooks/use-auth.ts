/**
 * Simple localStorage-based auth — no Convex needed
 */
import { useState, useEffect } from "react";

interface LocalUser {
  name: string;
  email: string;
  isAnonymous: boolean;
}

const STORAGE_KEY = "nabz_user";

function getStoredUser(): LocalUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function useAuth() {
  const [user, setUser] = useState<LocalUser | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Auto sign-in as anonymous on first visit
    if (!user) {
      const anon: LocalUser = { name: "معامله‌گر", email: "trader@local", isAnonymous: true };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(anon));
      setUser(anon);
    }
    setIsLoading(false);
  }, []);

  const signIn = async (email?: string) => {
    const u: LocalUser = { name: email?.split("@")[0] || "معامله‌گر", email: email || "trader@local", isAnonymous: !email };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  };

  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return { user, isLoading, isAuthenticated: !!user, signIn, signOut };
}
