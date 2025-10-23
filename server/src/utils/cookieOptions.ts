// src/utils/cookieOptions.ts
import { CookieOptions } from "express";

export function getCookieOptions(
  maxAgeMs: number,
  { crossDomain = false, isRefresh = false }: { crossDomain?: boolean; isRefresh?: boolean } = {}
): CookieOptions {
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    return {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: maxAgeMs,
      path: "/",
    };
  }

  // 🔥 Production environment - cross-domain setup
  return {
    httpOnly: true,
    secure: true,
    sameSite: "none", // 🔥 Changed from "strict" to "none" to allow cross-domain cookies
    maxAge: maxAgeMs,
    path: isRefresh ? "/auth/refresh" : "/",
    // 🔥 Do NOT set domain - let the browser handle it automatically
    // This allows cookies to work with both custom domains and Railway domains
  };
}
