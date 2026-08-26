import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "../supabase/client";
import { localStorageDriver, STORAGE_KEYS } from "../storage/localStorageDriver";
import type { AuthState, CurrentUser } from "../../types/auth";

export const DEV_MOCK_USER: CurrentUser = {
  id: "user-dev-1",
  displayName: "User",
  username: "user",
  avatarUrl: "",
};

export const DEV_SEED_USERS = [
  {
    email: "alex@vibehub.dev",
    name: "Алексей Смирнов",
    handle: "alex_dev",
    initials: "АС",
    roleLabel: "Frontend Lead",
  },
  {
    email: "maria@vibehub.dev",
    name: "Мария Иванова",
    handle: "maria_ai",
    initials: "МИ",
    roleLabel: "AI Researcher",
  },
  {
    email: "dmitry@vibehub.dev",
    name: "Дмитрий Козлов",
    handle: "dmitry_k",
    initials: "ДК",
    roleLabel: "Fullstack Dev",
  },
] as const;

export function getSafeRedirectUrl(targetUrl?: string): string {
  try {
    const baseOrigin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:5173";
    const raw =
      targetUrl ||
      (typeof window !== "undefined" ? window.location.href : "/");
    const parsed = new URL(raw, baseOrigin);

    // Disallow external redirects: return URL must match baseOrigin
    if (parsed.origin !== baseOrigin) {
      return baseOrigin;
    }

    // Strip OAuth service parameters
    parsed.searchParams.delete("code");
    parsed.searchParams.delete("state");
    parsed.searchParams.delete("error");
    parsed.searchParams.delete("error_description");
    parsed.searchParams.delete("error_code");

    // Strip hash fragments containing OAuth params
    if (parsed.hash.includes("access_token") || parsed.hash.includes("error")) {
      parsed.hash = "";
    }

    return parsed.toString();
  } catch {
    return typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:5173";
  }
}

export function mapSupabaseUser(user: User): CurrentUser {
  const meta = user.user_metadata || {};

  // Defensive handle resolution: handle -> user_name -> preferred_username -> login -> username -> email split -> 'user'
  const rawHandle =
    meta.handle ||
    meta.user_name ||
    meta.preferred_username ||
    meta.login ||
    meta.username ||
    (user.email ? user.email.split("@")[0].toLowerCase() : "");

  const handle = rawHandle
    ? rawHandle
        .toLowerCase()
        .replace(/[\s-]+/g, "_")
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 30)
    : "user";

  // Defensive display name resolution: name/full_name -> user_name/login -> email prefix -> 'GitHub User'
  const displayName =
    meta.name ||
    meta.full_name ||
    meta.displayName ||
    meta.user_name ||
    meta.preferred_username ||
    meta.login ||
    (user.email ? user.email.split("@")[0] : "GitHub User");

  const avatarUrl = meta.avatar_url || meta.avatarUrl || "";

  return {
    id: user.id,
    username: handle || "user",
    displayName: displayName || "GitHub User",
    avatarUrl,
  };
}

export class AuthService {
  private listeners: Set<(state: AuthState) => void> = new Set();
  private state: AuthState;
  private client = getSupabaseClient();

  constructor() {
    if (this.client) {
      this.state = { status: "loading", user: null };
      this.initSupabaseAuth();
    } else {
      const saved = localStorageDriver.getItem<CurrentUser>(STORAGE_KEYS.AUTH_USER);
      if (saved && saved.id) {
        this.state = { status: "authenticated", user: saved };
      } else {
        this.state = { status: "anonymous", user: null };
      }
    }
  }

  private async initSupabaseAuth() {
    if (!this.client) return;

    try {
      const { data, error } = await this.client.auth.getSession();
      if (error) throw error;

      if (data.session?.user) {
        this.state = {
          status: "authenticated",
          user: mapSupabaseUser(data.session.user),
        };
      } else {
        this.state = { status: "anonymous", user: null };
      }
    } catch (err) {
      console.warn("Failed to retrieve initial Supabase auth session:", err);
      this.state = { status: "anonymous", user: null };
    } finally {
      this.notify();
    }

    this.client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        this.state = {
          status: "authenticated",
          user: mapSupabaseUser(session.user),
        };
      } else {
        this.state = { status: "anonymous", user: null };
      }
      this.notify();
    });
  }

  getAuthState(): AuthState {
    return this.state;
  }

  async signInWithPassword({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<CurrentUser> {
    if (!this.client) {
      return this.loginDev();
    }

    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error("Пользователь не найден");

    const user = mapSupabaseUser(data.user);
    this.state = { status: "authenticated", user };
    this.notify();
    return user;
  }

  async signUp({
    email,
    password,
    name,
    handle,
    initials,
  }: {
    email: string;
    password: string;
    name?: string;
    handle?: string;
    initials?: string;
  }): Promise<CurrentUser | null> {
    if (!this.client) {
      return this.loginDev();
    }

    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name?.trim() || email.split("@")[0],
          handle: handle?.trim().toLowerCase() || email.split("@")[0].toLowerCase(),
          initials: initials?.trim().toUpperCase() || "VH",
        },
      },
    });

    if (error) throw error;

    if (data.user) {
      const user = mapSupabaseUser(data.user);
      if (data.session) {
        this.state = { status: "authenticated", user };
        this.notify();
      }
      return user;
    }
    return null;
  }

  async signInWithOAuth(
    provider: "github" = "github",
    returnUrl?: string,
  ): Promise<void> {
    if (!this.client) {
      if (import.meta.env.DEV) {
        this.loginDev();
        return;
      }
      throw new Error("Supabase client is not configured");
    }

    const redirectTo = getSafeRedirectUrl(returnUrl);
    if (import.meta.env.DEV) {
      console.log("[AuthService] Starting OAuth with redirectTo:", redirectTo);
    }
    const { error } = await this.client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });

    if (error) throw error;
  }

  async logout(): Promise<void> {
    if (this.client) {
      await this.client.auth.signOut();
    }
    this.state = { status: "anonymous", user: null };
    localStorageDriver.removeItem(STORAGE_KEYS.AUTH_USER);
    this.notify();
  }

  async loginDevUser(
    email = "alex@vibehub.dev",
    password = "password123",
  ): Promise<CurrentUser> {
    if (!import.meta.env.DEV) {
      throw new Error("loginDevUser is only allowed in development mode");
    }

    if (!this.client) {
      return this.loginDev();
    }

    return this.signInWithPassword({ email, password });
  }

  loginDev(): CurrentUser {
    if (!import.meta.env.DEV) {
      throw new Error("Dev login is disabled in production");
    }
    this.state = { status: "authenticated", user: DEV_MOCK_USER };
    localStorageDriver.setItem(STORAGE_KEYS.AUTH_USER, DEV_MOCK_USER);
    this.notify();
    return DEV_MOCK_USER;
  }

  onAuthChange(cb: (state: AuthState) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.state));
  }
}

export const authService = new AuthService();
