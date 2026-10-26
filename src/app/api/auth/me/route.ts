import { NextResponse } from "next/server";
import {
  getSessionUser,
  hashPassword,
  verifyPassword,
  requireUser,
  USER_PUBLIC_SELECT,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getSessionUser();
    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json({ user: null });
  }
}

export async function PUT(req: Request) {
  try {
    const sessionUser = await requireUser();
    if (sessionUser instanceof Response) return sessionUser;

    const body = await req.json();
    const { name, color, avatarUrl, currentPassword, newPassword } = body;

    const dataToUpdate: any = {};
    if (name && name.trim()) {
      dataToUpdate.name = name.trim();
    }
    if (typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)) {
      dataToUpdate.color = color;
    }
    if (avatarUrl !== undefined) {
      // Only allow images uploaded through /api/upload (or clearing the avatar)
      if (avatarUrl !== null && !(typeof avatarUrl === "string" && avatarUrl.startsWith("/uploads/"))) {
        return NextResponse.json({ error: "올바르지 않은 프로필 이미지입니다." }, { status: 400 });
      }
      dataToUpdate.avatarUrl = avatarUrl;
    }

    // Password change logic
    if (newPassword) {
      if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json(
          { error: `새 비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자리 이상이어야 합니다.` },
          { status: 400 }
        );
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: sessionUser.id },
      });

      if (!dbUser) {
        return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
      }

      if (dbUser.password) {
        if (!currentPassword) {
          return NextResponse.json(
            { error: "현재 비밀번호를 입력해 주세요." },
            { status: 400 }
          );
        }
        const isMatch = await verifyPassword(currentPassword, dbUser.password);
        if (!isMatch) {
          return NextResponse.json(
            { error: "현재 비밀번호가 일치하지 않습니다." },
            { status: 400 }
          );
        }
      }

      dataToUpdate.password = await hashPassword(newPassword);
    }

    const updated = await prisma.user.update({
      where: { id: sessionUser.id },
      data: dataToUpdate,
      select: USER_PUBLIC_SELECT,
    });

    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error("PUT /api/auth/me error:", err);
    return NextResponse.json(
      { error: "회원정보 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
