import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const calendar = await prisma.calendar.findUnique({
      where: { inviteCode: code },
    });

    if (!calendar) {
      return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
    }

    // Check if already a member
    const existing = await prisma.calendarMember.findUnique({
      where: {
        calendarId_userId: {
          calendarId: calendar.id,
          userId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({
        message: "Already a member",
        calendarId: calendar.id,
      });
    }

    const member = await prisma.calendarMember.create({
      data: {
        calendarId: calendar.id,
        userId,
        role: "MEMBER",
      },
    });

    return NextResponse.json({
      success: true,
      calendarId: calendar.id,
      member,
    });
  } catch (error) {
    console.error("POST /api/invite/[code] error:", error);
    return NextResponse.json({ error: "Failed to join calendar" }, { status: 500 });
  }
}
