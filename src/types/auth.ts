export interface CurrentUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export type AuthStatus = "loading" | "anonymous" | "authenticated";

export interface AuthState {
  status: AuthStatus;
  user: CurrentUser | null;
}
