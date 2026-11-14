import "server-only";
import { cache } from "react";
import { getSessionCookie, deleteSessionCookie } from "./cookies";
import { validateSession, SafeUser } from "./session";

export class AuthError extends Error {
  code: "UNAUTHORIZED" | "FORBIDDEN";

  constructor(message: string, code: "UNAUTHORIZED" | "FORBIDDEN") {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

/**
 * Retrieves the currently authenticated user for the active request.
 * Wrapped in React cache() to guarantee memoization: multiple invocations within
 * the same request lifecycle (e.g. across nested layout, page, and server components)
 * execute at most one database query.
 *
 * @returns SafeUser without passwordHash, or null if unauthenticated
 */
export const getCurrentUser = cache(async (): Promise<SafeUser | null> => {
  const token = await getSessionCookie();
  if (!token) {
    return null;
  }

  const result = await validateSession(token);
  if (!result) {
    // If the token is invalid or expired, clear the stale cookie
    await deleteSessionCookie().catch(() => {});
    return null;
  }

  return result.user;
});

/**
 * Requires an authenticated user session.
 * Throws an AuthError("UNAUTHORIZED") if the user is not authenticated.
 *
 * @returns SafeUser
 */
export async function requireUser(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Authentication required to access this resource", "UNAUTHORIZED");
  }
  return user;
}

/**
 * Requires an authenticated user with administrative role (ADMIN).
 * Throws AuthError("UNAUTHORIZED") if unauthenticated, or AuthError("FORBIDDEN")
 * if the user lacks administrative privileges.
 *
 * @returns SafeUser with role "ADMIN"
 */
export async function requireAdmin(): Promise<SafeUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new AuthError("Administrative privileges required to access this resource", "FORBIDDEN");
  }
  return user;
}
