import { NextResponse } from "next/server";
import { getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";
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
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await req.json();
    const { name, color, avatarUrl, currentPassword, newPassword } = body;

    const dataToUpdate: any = {};
    if (name && name.trim()) {
      dataToUpdate.name = name.trim();
    }
    if (color) {
      dataToUpdate.color = color;
    }
    if (avatarUrl !== undefined) {
      dataToUpdate.avatarUrl = avatarUrl;
    }

    // Password change logic
    if (newPassword) {
      if (newPassword.length < 4) {
        return NextResponse.json(
          { error: "새 비밀번호는 최소 4자리 이상이어야 합니다." },
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
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        color: true,
      },
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
