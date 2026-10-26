import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { UserDto } from "@/types";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  return "mytree-dev-only-secret";
}

export const MIN_PASSWORD_LENGTH = 8;
export const AUTH_COOKIE_NAME = "mytree_session";

/** Fields safe to send to clients (never includes the password hash). */
export const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  color: true,
} as const;

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createAuthToken(user: { id: string; email: string; name: string }): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
    },
    getJwtSecret(),
    { expiresIn: "30d" } // 30-day session
  );
}

export function verifyAuthToken(token: string): { userId: string; email: string; name: string } | null {
  try {
    return jwt.verify(token, getJwtSecret()) as { userId: string; email: string; name: string };
  } catch (err) {
    return null;
  }
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
      select: USER_PUBLIC_SELECT,
    });
  } catch (e) {
    return null;
  }
}

/**
 * Authenticated user or a 401 response. Usage:
 *   const auth = await requireUser(); if (auth instanceof Response) return auth;
 */
export async function requireUser(): Promise<UserDto | Response> {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  return user;
}

/** Calendar membership of the user, or null if they are not a member. */
export async function getMembership(calendarId: string, userId: string) {
  return prisma.calendarMember.findUnique({
    where: { calendarId_userId: { calendarId, userId } },
  });
}

export function forbidden(message = "접근 권한이 없습니다.") {
  return Response.json({ error: message }, { status: 403 });
}

export function setSessionCookie(response: { cookies: { set: (opts: any) => unknown } }, token: string) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}
