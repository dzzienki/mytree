import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// Public: lets an invitee preview the calendar before signing up / joining
export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const calendar = await prisma.calendar.findUnique({
      where: { inviteCode: code },
      select: {
        name: true,
        description: true,
        color: true,
        _count: {
          select: { members: true },
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

// Joins the logged-in user to the calendar behind the invite code
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const auth = await requireUser();
    if (auth instanceof Response) return auth;

    const { code } = await params;

    const calendar = await prisma.calendar.findUnique({
      where: { inviteCode: code },
    });

    if (!calendar) {
      return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
    }

    await prisma.calendarMember.upsert({
      where: {
        calendarId_userId: { calendarId: calendar.id, userId: auth.id },
      },
      update: {},
      create: { calendarId: calendar.id, userId: auth.id, role: "MEMBER" },
    });

    return NextResponse.json({ success: true, calendarId: calendar.id });
  } catch (error) {
    console.error("POST /api/invite/[code] error:", error);
    return NextResponse.json({ error: "Failed to join calendar" }, { status: 500 });
  }
}
