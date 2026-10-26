import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createAuthToken, setAuthCookie } from "@/lib/auth";
import { clientIp, isLimited, record, clear } from "@/lib/rate-limit";

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
// Valid bcrypt hash of a throwaway string: compared when the email is unknown so
// response time doesn't reveal whether the account exists.
const DUMMY_HASH = "$2b$10$4SLMhtZxysxi.0LbVGUtxu37rQUT9sZ7OPsMC7YIUklMFygxAf9wW";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return NextResponse.json({ error: "이메일과 비밀번호를 입력해 주세요." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const ipKey = `login:ip:${clientIp(req)}`;
    const emailKey = `login:email:${normalizedEmail}`;

    if (isLimited(ipKey, MAX_FAILURES * 4, WINDOW_MS) || isLimited(emailKey, MAX_FAILURES, WINDOW_MS)) {
      return NextResponse.json(
        { error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    const isMatch = await verifyPassword(password, user?.password ?? DUMMY_HASH);

    if (!user || !user.password || !isMatch) {
      record(ipKey);
      record(emailKey);
      return NextResponse.json(
        { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    clear(emailKey);

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        color: user.color,
      },
    });
    setAuthCookie(response, createAuthToken(user));
    return response;
  } catch (err) {
    console.error("POST /api/auth/login error:", err);
    return NextResponse.json({ error: "로그인 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
