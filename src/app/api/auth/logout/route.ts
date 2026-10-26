import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, assertSameOrigin, handleError } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const response = NextResponse.json({ success: true });
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  } catch (err) {
    return handleError(err, "POST /api/auth/logout", "로그아웃 중 오류가 발생했습니다.");
  }
}
