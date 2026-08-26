export interface CurrentUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  name?: string;
  handle?: string;
  initials?: string;
}

export type AuthStatus = "loading" | "anonymous" | "authenticated";

export interface AuthState {
  status: AuthStatus;
  user: CurrentUser | null;
}
