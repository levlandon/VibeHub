import { localStorageDriver, STORAGE_KEYS } from "../storage/localStorageDriver";
import type { AuthState, CurrentUser } from "../../types/auth";

export const DEV_MOCK_USER: CurrentUser = {
  id: "user-dev-1",
  displayName: "User",
  username: "user",
  avatarUrl: "",
};

export class AuthService {
  private listeners: Set<(state: AuthState) => void> = new Set();
  private state: AuthState;

  constructor() {
    const saved = localStorageDriver.getItem<CurrentUser>(STORAGE_KEYS.AUTH_USER);
    if (saved && saved.id) {
      this.state = { status: "authenticated", user: saved };
    } else {
      this.state = { status: "anonymous", user: null };
    }
  }

  getAuthState(): AuthState {
    return this.state;
  }

  loginDev(): CurrentUser {
    this.state = { status: "authenticated", user: DEV_MOCK_USER };
    localStorageDriver.setItem(STORAGE_KEYS.AUTH_USER, DEV_MOCK_USER);
    this.notify();
    return DEV_MOCK_USER;
  }

  logout(): void {
    this.state = { status: "anonymous", user: null };
    localStorageDriver.removeItem(STORAGE_KEYS.AUTH_USER);
    this.notify();
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
