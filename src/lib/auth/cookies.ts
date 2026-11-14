import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./session";

/**
 * Sets the secure HTTP-only session cookie using Next.js 16 asynchronous cookies() API.
 *
 * @param rawToken The raw bearer session token
 * @param expiresAt The date when the session cookie expires
 */
export async function setSessionCookie(rawToken: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Retrieves the raw bearer session token from incoming request cookies.
 *
 * @returns Raw token string or null if not present
 */
export async function getSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  return cookie?.value || null;
}

/**
 * Deletes the session cookie upon logout or invalidation.
 */
export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
