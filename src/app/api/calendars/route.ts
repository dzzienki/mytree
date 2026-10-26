import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, requireUser } from "@/lib/auth";
import { hexColor, str } from "@/lib/validate";
import { calendarInclude } from "@/lib/includes";

export async function GET(req: Request) {
  try {
    const me = await requireUser(req);

    const calendars = await prisma.calendar.findMany({
      where: { members: { some: { userId: me.id } } },
      include: {
        ...calendarInclude,
        _count: { select: { events: true, keepItems: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(calendars);
  } catch (error) {
    return handleError(error, "GET /api/calendars", "Failed to fetch calendars");
  }
}

export async function POST(req: Request) {
  try {
    const me = await requireUser(req);
    const body = await req.json();
    const name = str(body.name, "캘린더 이름", 50, true)!;
    const description = str(body.description, "설명", 500);
    const color = hexColor(body.color);

    const defaultLabels = [
      { name: "기본 일정", colorHex: color || "#10B981", orderIndex: 0 },
      { name: "중요 / 기념일", colorHex: "#EC4899", orderIndex: 1 },
      { name: "약속 / 모임", colorHex: "#3B82F6", orderIndex: 2 },
      { name: "업무 / 할 일", colorHex: "#F59E0B", orderIndex: 3 },
      { name: "기타", colorHex: "#8B5CF6", orderIndex: 4 },
    ];

    const calendar = await prisma.calendar.create({
      data: {
        name,
        description,
        color: color || "#10B981",
        members: { create: { userId: me.id, role: "OWNER" } },
        labels: { create: defaultLabels },
      },
      include: calendarInclude,
    });

    return NextResponse.json(calendar);
  } catch (error) {
    return handleError(error, "POST /api/calendars", "Failed to create calendar");
  }
}
