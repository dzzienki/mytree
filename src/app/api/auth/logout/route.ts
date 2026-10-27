import { NextResponse } from "next/server";
import { assertSameOrigin, clearAuthCookie, handleError } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const response = NextResponse.json({ success: true });
    clearAuthCookie(response);
    return response;
  } catch (err) {
    return handleError(err, "POST /api/auth/logout", "로그아웃 중 오류가 발생했습니다.");
  }
}
