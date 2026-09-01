import type { Language } from "../../i18n";
import { translate } from "../../i18n";

export type AuthErrorKey =
  | "passwordTooShort"
  | "invalidEmail"
  | "invalidCredentials"
  | "emailExists"
  | "rateLimit"
  | "oauthFailure"
  | "network"
  | "userNotFound"
  | "generic";

interface AuthErrorLike {
  code?: unknown;
  status?: unknown;
  type?: unknown;
  name?: unknown;
  message?: unknown;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase() : "";
}

/**
 * Convert Supabase/Auth errors into stable internal keys. The raw message is
 * intentionally used only for classification and never returned to the UI.
 */
export function mapAuthError(error: unknown): AuthErrorKey {
  const candidate = (error && typeof error === "object" ? error : {}) as AuthErrorLike;
  const code = text(candidate.code);
  const type = text(candidate.type);
  const name = text(candidate.name);
  const message = text(candidate.message);
  const status = typeof candidate.status === "number" ? candidate.status : undefined;
  const codeLike = `${code} ${type}`;
  const haystack = `${codeLike} ${name} ${message}`;

  if (
    codeLike.includes("weak_password") ||
    codeLike.includes("password_too_short") ||
    message.includes("at least 6") ||
    message.includes("password should be at least") ||
    message.includes("password must be at least")
  ) {
    return "passwordTooShort";
  }

  if (
    codeLike.includes("email_address_invalid") ||
    codeLike.includes("invalid_email") ||
    message.includes("invalid email") ||
    message.includes("valid email") ||
    (message.includes("email address") && message.includes("invalid"))
  ) {
    return "invalidEmail";
  }

  if (
    codeLike.includes("user_already_exists") ||
    codeLike.includes("email_exists") ||
    codeLike.includes("user_exists") ||
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("already been registered")
  ) {
    return "emailExists";
  }

  if (
    codeLike.includes("over_request_rate_limit") ||
    codeLike.includes("too_many_requests") ||
    status === 429 ||
    haystack.includes("rate limit") ||
    haystack.includes("too many requests")
  ) {
    return "rateLimit";
  }

  if (
    codeLike.includes("invalid_credentials") ||
    codeLike.includes("invalid_login_credentials") ||
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  ) {
    return "invalidCredentials";
  }

  if (
    codeLike.includes("oauth") ||
    codeLike.includes("provider") ||
    name.includes("oauth") ||
    message.includes("oauth") ||
    message.includes("github")
  ) {
    return "oauthFailure";
  }

  if (
    codeLike.includes("network") ||
    name.includes("network") ||
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("failed to fetch") ||
    message.includes("unavailable") ||
    message.includes("timeout")
  ) {
    return "network";
  }

  if (
    codeLike.includes("user_not_found") ||
    message.includes("user not found") ||
    message.includes("пользователь не найден")
  ) {
    return "userNotFound";
  }

  return "generic";
}

export function getAuthErrorMessage(error: unknown, language: Language): string {
  return translate(language, `auth.errors.${mapAuthError(error)}`);
}
