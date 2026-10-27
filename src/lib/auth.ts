import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { UserDto } from "@/types";
import { BASE_PATH } from "./base-path";

export const AUTH_COOKIE_NAME = "mytree_session";

/** Never select `password` for anything that leaves the server. */
export const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  color: true,
} as const;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set to a random string of at least 32 characters");
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createAuthToken(user: { id: string; email: string; name: string }): string {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name },
    getJwtSecret(),
    { algorithm: "HS256", expiresIn: "30d" }
  );
}

export function verifyAuthToken(token: string): { userId: string; email: string; name: string } | null {
  try {
    return jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] }) as {
      userId: string;
      email: string;
      name: string;
    };
  } catch {
    return null;
  }
}

// Scoped to the base path so other apps sharing the domain never receive the session cookie.
const COOKIE_PATH = BASE_PATH || "/";

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

/** Must use the same path as setAuthCookie or the browser keeps the cookie. */
export function clearAuthCookie(response: NextResponse) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: 0,
  });
}

/**
 * Returns currently authenticated user from session cookie (Server side)
 */
export async function getSessionUser(): Promise<UserDto | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifyAuthToken(token);
    if (!payload) return null;

    return await prisma.user.findUnique({
      where: { id: payload.userId },
      select: PUBLIC_USER_SELECT,
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Authorization guards for route handlers
// ---------------------------------------------------------------------------

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type Role = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
const ROLE_RANK: Record<Role, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };

/**
 * Cookie auth needs a CSRF guard on state-changing requests: reject when the
 * browser says the request originates from a different site.
 */
export function assertSameOrigin(req: Request) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return;
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser client; the cookie can't be attached cross-site without Origin
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "잘못된 요청입니다.");
  }
  if (originHost !== host) throw new HttpError(403, "잘못된 요청입니다.");
}

/** Resolves the logged-in user or throws 401. Also applies the CSRF origin check. */
export async function requireUser(req: Request): Promise<UserDto> {
  assertSameOrigin(req);
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "로그인이 필요합니다.");
  return user;
}

/** Throws 403 unless the user belongs to the calendar with at least `minRole`. */
export async function requireMember(
  userId: string,
  calendarId: string,
  minRole: Role = "MEMBER"
): Promise<Role> {
  const member = await prisma.calendarMember.findUnique({
    where: { calendarId_userId: { calendarId, userId } },
    select: { role: true },
  });
  // 404-style message so non-members can't probe which calendars exist
  if (!member) throw new HttpError(403, "접근 권한이 없습니다.");
  const role = member.role as Role;
  if ((ROLE_RANK[role] ?? -1) < ROLE_RANK[minRole]) {
    throw new HttpError(403, "권한이 부족합니다.");
  }
  return role;
}

/** IDs of every calendar the user belongs to. */
export async function memberCalendarIds(userId: string): Promise<string[]> {
  const rows = await prisma.calendarMember.findMany({
    where: { userId },
    select: { calendarId: true },
  });
  return rows.map((r) => r.calendarId);
}

/** Converts a thrown HttpError into its response; anything else becomes a 500. */
export function handleError(err: unknown, label: string, fallback: string) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(`${label} error:`, err);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
