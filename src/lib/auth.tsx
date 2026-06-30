"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, captchaToken: string) => Promise<void>;
  signup: (name: string, email: string, phone: string, password: string, captchaToken: string) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string, captchaToken: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toUser(supabaseUser: SupabaseUser | null | undefined): User | null {
  if (!supabaseUser) return null;
  const fullName = (supabaseUser.user_metadata?.full_name as string | undefined) ?? "";
  const name = fullName || capitalize(supabaseUser.email?.split("@")[0].replace(/[._]/g, " ") ?? "Investor");
  return { id: supabaseUser.id, name, email: supabaseUser.email ?? "" };
}

function capitalize(s: string) {
  return s
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(toUser(data.session?.user));
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toUser(session?.user));
      setLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, [supabase]);

  async function login(email: string, password: string, captchaToken: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    });
    if (error) throw new Error(error.message);

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", data.user.id)
        .single();
      if (profile?.status === "suspended") {
        await supabase.auth.signOut();
        throw new Error("Your account has been suspended. Contact support for help.");
      }
    }
  }

  async function signup(name: string, email: string, phone: string, password: string, captchaToken: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, phone }, captchaToken },
    });
    if (error) throw new Error(error.message);
    if (!data.session) {
      throw new Error(
        "Account created, but email confirmation is required before you can log in. Disable \"Confirm email\" in your Supabase project's Auth settings to skip this in development."
      );
    }
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  async function requestPasswordReset(email: string, captchaToken: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
      captchaToken,
    });
    if (error) throw new Error(error.message);
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, logout, requestPasswordReset, updatePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  return { user, loading };
}
