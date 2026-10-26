import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const calendarId = searchParams.get("calendarId");
    const userId = searchParams.get("userId");

    const where: any = {};
    if (calendarId && calendarId !== "all") {
      where.calendarId = calendarId;
    } else if (userId) {
      where.calendar = {
        members: {
          some: { userId },
        },
      };
    }

    const activities = await prisma.activityLog.findMany({
      where,
      include: {
        user: true,
        calendar: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error("GET /api/activities error:", error);
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
  }
}
