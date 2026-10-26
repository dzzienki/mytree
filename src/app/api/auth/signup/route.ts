import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createAuthToken, setSessionCookie, MIN_PASSWORD_LENGTH } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, inviteCode } = body;

    if (
      typeof name !== "string" || typeof email !== "string" || typeof password !== "string" ||
      !name.trim() || !email || !password
    ) {
      return NextResponse.json({ error: "이름, 이메일, 비밀번호를 모두 입력해 주세요." }, { status: 400 });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자리 이상이어야 합니다.` },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "올바른 이메일 주소를 입력해 주세요." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json({ error: "이미 가입된 이메일 주소입니다." }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    // Random pastel avatar color
    const colors = ["#10B981", "#3B82F6", "#EC4899", "#F59E0B", "#8B5CF6", "#06B6D4"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        color: randomColor,
      },
    });

    // Handle invite code if provided
    let joinedCalendarId: string | null = null;
    const targetCalendar =
      typeof inviteCode === "string" && inviteCode
        ? await prisma.calendar.findUnique({ where: { inviteCode } })
        : null;
    if (targetCalendar) {
      await prisma.calendarMember.create({
        data: {
          calendarId: targetCalendar.id,
          userId: newUser.id,
          role: "MEMBER",
        },
      });
      joinedCalendarId = targetCalendar.id;
    } else {
      // No (valid) invite code: create an initial personal calendar for the user
      await prisma.calendar.create({
        data: {
          name: `${newUser.name}의 개인 캘린더`,
          description: "나만의 소중한 일정과 계획",
          color: randomColor,
          members: {
            create: {
              userId: newUser.id,
              role: "OWNER",
            },
          },
          labels: {
            create: [
              { name: "개인 일정", colorHex: randomColor, orderIndex: 0 },
              { name: "약속 / 모임", colorHex: "#3B82F6", orderIndex: 1 },
              { name: "할 일 / 메모", colorHex: "#F59E0B", orderIndex: 2 },
            ],
          },
        },
      });
    }

    const token = createAuthToken(newUser);

    const response = NextResponse.json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        avatarUrl: newUser.avatarUrl,
        color: newUser.color,
      },
      joinedCalendarId,
    });

    setSessionCookie(response, token);

    return response;
  } catch (err) {
    console.error("POST /api/auth/signup error:", err);
    return NextResponse.json({ error: "회원가입 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
