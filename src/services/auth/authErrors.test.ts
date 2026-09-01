import { describe, expect, it } from "vitest";
import { getAuthErrorMessage, mapAuthError } from "./authErrors";

describe("auth error localization", () => {
  it.each([
    [{ code: "weak_password", message: "Password should be at least 6 characters." }, "passwordTooShort"],
    [{ type: "invalid_email" }, "invalidEmail"],
    [{ code: "invalid_email" }, "invalidEmail"],
    [{ code: "invalid_credentials" }, "invalidCredentials"],
    [{ code: "user_already_exists" }, "emailExists"],
    [{ status: 429 }, "rateLimit"],
    [{ code: "oauth_failure" }, "oauthFailure"],
    [{ name: "TypeError", message: "Failed to fetch" }, "network"],
    [{ code: "unrecognised_backend_code", message: "opaque backend detail" }, "generic"],
  ])("maps %j to %s", (error, expected) => {
    expect(mapAuthError(error)).toBe(expected);
  });

  it("returns localized messages without exposing the backend message", () => {
    const backendError = {
      code: "weak_password",
      message: "Password should be at least 6 characters.",
    };

    expect(getAuthErrorMessage(backendError, "ru")).toBe(
      "Пароль должен содержать не менее 6 символов.",
    );
    expect(getAuthErrorMessage(backendError, "en")).toBe(
      "Password must be at least 6 characters.",
    );
    expect(getAuthErrorMessage({ message: "private backend detail" }, "en")).not.toContain(
      "private backend detail",
    );
  });
});
