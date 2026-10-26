import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    const calendars = await prisma.calendar.findMany({
      where: userId
        ? {
            members: {
              some: { userId },
            },
          }
        : undefined,
      include: {
        members: {
          include: {
            user: true,
          },
        },
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
    const body = await req.json();
    const { name, description, color, userId } = body;

    if (!name || !userId) {
      return NextResponse.json({ error: "Name and userId are required" }, { status: 400 });
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
        name,
        description,
        color: color || "#10B981",
        members: {
          create: {
            userId,
            role: "OWNER",
          },
        },
        labels: {
          create: defaultLabels,
        },
      },
      include: {
        members: {
          include: { user: true },
        },
        labels: true,
      },
    });

    return NextResponse.json(calendar);
  } catch (error) {
    console.error("POST /api/calendars error:", error);
    return NextResponse.json({ error: "Failed to create calendar" }, { status: 500 });
  }
}
