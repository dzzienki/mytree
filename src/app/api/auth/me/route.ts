import { NextResponse } from "next/server";
import { getSessionUser, hashPassword, verifyPassword, requireUser, handleError, PUBLIC_USER_SELECT } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bad, hexColor, str, MIN_PASSWORD_LENGTH } from "@/lib/validate";
import { isLimited, record, clear } from "@/lib/rate-limit";

export async function GET() {
  try {
    const user = await getSessionUser();
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}

export async function PUT(req: Request) {
  try {
    const sessionUser = await requireUser(req);

    const body = await req.json();
    const { avatarUrl, currentPassword, newPassword } = body;

    const dataToUpdate: { name?: string; color?: string; avatarUrl?: string | null; password?: string } = {};

    const name = str(body.name, "이름", 50);
    if (name) dataToUpdate.name = name;

    const color = hexColor(body.color);
    if (color) dataToUpdate.color = color;

    if (avatarUrl !== undefined) {
      if (avatarUrl !== null && (typeof avatarUrl !== "string" || !/^\/uploads\/[\w.-]+$/.test(avatarUrl))) {
        bad("프로필 이미지 경로가 올바르지 않습니다.");
      }
      dataToUpdate.avatarUrl = avatarUrl;
    }

    if (newPassword) {
      if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > 200) {
        bad(`새 비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자리 이상이어야 합니다.`);
      }

      const dbUser = await prisma.user.findUnique({ where: { id: sessionUser.id } });
      if (!dbUser) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

      if (dbUser.password) {
        const key = `pwchange:${sessionUser.id}`;
        if (isLimited(key, 5, 15 * 60 * 1000)) {
          return NextResponse.json({ error: "시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
        }
        if (typeof currentPassword !== "string" || !currentPassword) bad("현재 비밀번호를 입력해 주세요.");
        if (!(await verifyPassword(currentPassword, dbUser.password))) {
          record(key);
          bad("현재 비밀번호가 일치하지 않습니다.");
        }
        clear(key);
      }
      dataToUpdate.password = await hashPassword(newPassword);
    }

    const updated = await prisma.user.update({
      where: { id: sessionUser.id },
      data: dataToUpdate,
      select: PUBLIC_USER_SELECT,
    });

    return NextResponse.json({ user: updated });
  } catch (err) {
    return handleError(err, "PUT /api/auth/me", "회원정보 수정 중 오류가 발생했습니다.");
  }
}
