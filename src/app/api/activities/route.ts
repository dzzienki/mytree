import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PUBLIC_USER_SELECT, handleError, memberCalendarIds, requireMember, requireUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const me = await requireUser(req);
    const calendarId = new URL(req.url).searchParams.get("calendarId");

    let calendarFilter: string | { in: string[] };
    if (calendarId && calendarId !== "all") {
      await requireMember(me.id, calendarId, "VIEWER");
      calendarFilter = calendarId;
    } else {
      calendarFilter = { in: await memberCalendarIds(me.id) };
    }

    const activities = await prisma.activityLog.findMany({
      where: { calendarId: calendarFilter },
      include: {
        user: { select: PUBLIC_USER_SELECT },
        calendar: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(activities);
  } catch (error) {
    return handleError(error, "GET /api/activities", "Failed to fetch activities");
  }
}
