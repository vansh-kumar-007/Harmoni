import "server-only";
import { cache } from "react";
import { getSessionCookie } from "./cookies";
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
 * In accordance with Next.js 16 Server Component rules, this read-only DAL function
 * does NOT attempt to modify or delete cookies. Cookie clearing happens strictly in
 * Server Actions or Route Handlers upon logout or rejection.
 *
 * @returns SafeUser without passwordHash, or null if unauthenticated or expired
 */
export const getCurrentUser = cache(async (): Promise<SafeUser | null> => {
  const token = await getSessionCookie();
  if (!token) {
    return null;
  }

  const result = await validateSession(token);
  if (!result) {
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
