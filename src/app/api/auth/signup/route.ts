import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createAuthToken, setAuthCookie, handleError, HttpError } from "@/lib/auth";
import { bad, str, MIN_PASSWORD_LENGTH } from "@/lib/validate";
import { clientIp, isLimited, record } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = str(body.name, "이름", 50, true)!;
    const email = str(body.email, "이메일", 254, true)!;
    const { password, inviteCode } = body;

    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH || password.length > 200) {
      bad(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) bad("이메일 형식이 올바르지 않습니다.");

    const ipKey = `signup:ip:${clientIp(req)}`;
    if (isLimited(ipKey, 10, 60 * 60 * 1000)) {
      throw new HttpError(429, "가입 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.");
    }
    record(ipKey);

    const normalizedEmail = email.toLowerCase();

    // Anyone may sign up. Without an invite they only get their own personal calendar;
    // calendars are shared solely through the invite link. A supplied-but-invalid code is
    // rejected instead of silently ignored so the user doesn't end up in the wrong place.
    let targetCalendar = null;
    if (typeof inviteCode === "string" && inviteCode) {
      targetCalendar = await prisma.calendar.findUnique({ where: { inviteCode } });
      if (!targetCalendar) throw new HttpError(400, "유효하지 않은 초대 링크입니다.");
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "가입할 수 없는 이메일 주소입니다." }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const colors = ["#10B981", "#3B82F6", "#EC4899", "#F59E0B", "#8B5CF6", "#06B6D4"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    // User + calendar membership succeed or fail together.
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email: normalizedEmail, password: hashedPassword, color: randomColor },
      });
      if (targetCalendar) {
        await tx.calendarMember.create({
          data: { calendarId: targetCalendar.id, userId: user.id, role: "MEMBER" },
        });
      } else {
        await tx.calendar.create({
          data: {
            name: `${user.name}의 개인 캘린더`,
            description: "나만의 소중한 일정과 계획",
            color: randomColor,
            members: { create: { userId: user.id, role: "OWNER" } },
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
      return user;
    });

    const response = NextResponse.json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        avatarUrl: newUser.avatarUrl,
        color: newUser.color,
      },
      joinedCalendarId: targetCalendar?.id ?? null,
    });
    setAuthCookie(response, createAuthToken(newUser));
    return response;
  } catch (err) {
    return handleError(err, "POST /api/auth/signup", "회원가입 처리 중 오류가 발생했습니다.");
  }
}
