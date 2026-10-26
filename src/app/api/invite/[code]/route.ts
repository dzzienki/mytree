import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, requireUser } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const calendar = await prisma.calendar.findUnique({
      where: { inviteCode: code },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        inviteCode: true,
        _count: {
          select: { members: true, events: true },
        },
      },
    });

    if (!calendar) {
      return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
    }

    return NextResponse.json(calendar);
  } catch (error) {
    console.error("GET /api/invite/[code] error:", error);
    return NextResponse.json({ error: "Failed to process invite" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const me = await requireUser(req);

    const calendar = await prisma.calendar.findUnique({ where: { inviteCode: code } });
    if (!calendar) {
      return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
    }

    const existing = await prisma.calendarMember.findUnique({
      where: { calendarId_userId: { calendarId: calendar.id, userId: me.id } },
    });
    if (existing) {
      return NextResponse.json({ message: "Already a member", calendarId: calendar.id });
    }

    const member = await prisma.calendarMember.create({
      data: { calendarId: calendar.id, userId: me.id, role: "MEMBER" },
    });

    return NextResponse.json({ success: true, calendarId: calendar.id, member });
  } catch (error) {
    return handleError(error, "POST /api/invite/[code]", "Failed to join calendar");
  }
}
