import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, USER_PUBLIC_SELECT } from "@/lib/auth";

const memberInclude = { include: { user: { select: USER_PUBLIC_SELECT } } } as const;

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth instanceof Response) return auth;

    const calendars = await prisma.calendar.findMany({
      where: { members: { some: { userId: auth.id } } },
      include: {
        members: memberInclude,
        labels: {
          orderBy: { orderIndex: "asc" },
        },
        _count: {
          select: {
            events: true,
            keepItems: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(calendars);
  } catch (error) {
    console.error("GET /api/calendars error:", error);
    return NextResponse.json({ error: "Failed to fetch calendars" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (auth instanceof Response) return auth;

    const body = await req.json();
    const { name, description, color } = body;

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const defaultLabels = [
      { name: "기본 일정", colorHex: color || "#10B981", orderIndex: 0 },
      { name: "중요 / 기념일", colorHex: "#EC4899", orderIndex: 1 },
      { name: "약속 / 모임", colorHex: "#3B82F6", orderIndex: 2 },
      { name: "업무 / 할 일", colorHex: "#F59E0B", orderIndex: 3 },
      { name: "기타", colorHex: "#8B5CF6", orderIndex: 4 },
    ];

    const calendar = await prisma.calendar.create({
      data: {
        name: name.trim(),
        description,
        color: color || "#10B981",
        members: {
          create: {
            userId: auth.id,
            role: "OWNER",
          },
        },
        labels: {
          create: defaultLabels,
        },
      },
      include: {
        members: memberInclude,
        labels: true,
      },
    });

    return NextResponse.json(calendar);
  } catch (error) {
    console.error("POST /api/calendars error:", error);
    return NextResponse.json({ error: "Failed to create calendar" }, { status: 500 });
  }
}
