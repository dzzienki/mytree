import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, getMembership, forbidden, USER_PUBLIC_SELECT } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const auth = await requireUser();
    if (auth instanceof Response) return auth;

    const { searchParams } = new URL(req.url);
    const calendarId = searchParams.get("calendarId");

    const where: any = {};
    if (calendarId && calendarId !== "all") {
      if (!(await getMembership(calendarId, auth.id))) return forbidden();
      where.calendarId = calendarId;
    } else {
      where.calendar = { members: { some: { userId: auth.id } } };
    }

    const activities = await prisma.activityLog.findMany({
      where,
      include: {
        user: { select: USER_PUBLIC_SELECT },
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
