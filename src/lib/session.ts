import { headers } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Whether the visitor holds a sign-in cookie. A cookie check only (no network call),
 * so public pages stay fast; an expired cookie just leads to /dashboard, which
 * sends the visitor on to /login.
 */
export async function hasSession(): Promise<boolean> {
  return Boolean(getSessionCookie(await headers()));
}
