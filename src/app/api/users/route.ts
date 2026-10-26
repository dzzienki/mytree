import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PUBLIC_USER_SELECT, handleError, memberCalendarIds, requireUser } from "@/lib/auth";

// Lists only people who share a calendar with the caller. Accounts are created
// exclusively through /api/auth/signup (invite-only); there is no public POST here.
export async function GET(req: Request) {
  try {
    const me = await requireUser(req);
    const calendarIds = await memberCalendarIds(me.id);
    const users = await prisma.user.findMany({
      where: { calendarMembers: { some: { calendarId: { in: calendarIds } } } },
      select: PUBLIC_USER_SELECT,
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    return handleError(error, "GET /api/users", "Failed to fetch users");
  }
}
