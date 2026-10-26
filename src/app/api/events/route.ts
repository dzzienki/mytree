import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, getMembership, forbidden, USER_PUBLIC_SELECT } from "@/lib/auth";

const userSel = { select: USER_PUBLIC_SELECT } as const;

export async function GET(req: Request) {
  try {
    const auth = await requireUser();
    if (auth instanceof Response) return auth;

    const { searchParams } = new URL(req.url);
    const calendarId = searchParams.get("calendarId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};

    if (calendarId && calendarId !== "all") {
      if (!(await getMembership(calendarId, auth.id))) return forbidden();
      where.calendarId = calendarId;
    } else {
      where.calendar = { members: { some: { userId: auth.id } } };
    }

    if (startDate && endDate) {
      where.OR = [
        {
          startAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        {
          endAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        {
          AND: [
            { startAt: { lte: new Date(startDate) } },
            { endAt: { gte: new Date(endDate) } },
          ],
        },
      ];
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        label: true,
        creator: userSel,
        calendar: {
          select: { id: true, name: true, color: true },
        },
        participants: {
          include: { user: userSel },
        },
        attachments: true,
        comments: {
          include: { user: userSel },
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: { comments: true },
        },
      },
      orderBy: { startAt: "asc" },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("GET /api/events error:", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireUser();
    if (auth instanceof Response) return auth;

    const body = await req.json();
    const {
      calendarId,
      labelId,
      title,
      description,
      location,
      url,
      isAllDay,
      startAt,
      endAt,
      recurrenceRule,
      participantIds = [],
      attachments = [],
    } = body;

    if (!calendarId || !title || !startAt || !endAt) {
      return NextResponse.json(
        { error: "Required fields are missing (calendarId, title, startAt, endAt)" },
        { status: 400 }
      );
    }
    if (!(await getMembership(calendarId, auth.id))) return forbidden();

    // Only keep labels / participants that belong to this calendar
    const validLabel = labelId
      ? await prisma.label.findFirst({ where: { id: labelId, calendarId }, select: { id: true } })
      : null;
    const validParticipants = await prisma.calendarMember.findMany({
      where: { calendarId, userId: { in: participantIds } },
      select: { userId: true },
    });

    const event = await prisma.event.create({
      data: {
        calendarId,
        creatorId: auth.id,
        labelId: validLabel?.id ?? null,
        title,
        description: description || null,
        location: location || null,
        url: url || null,
        isAllDay: !!isAllDay,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        recurrenceRule: recurrenceRule || null,
        participants: {
          create: validParticipants.map((m) => ({ userId: m.userId })),
        },
        attachments: {
          create: attachments.map((att: any) => ({
            fileUrl: att.fileUrl || att.url,
            fileName: att.fileName || "image.jpg",
            fileType: att.fileType || "image/jpeg",
          })),
        },
      },
      include: {
        label: true,
        creator: userSel,
        calendar: { select: { id: true, name: true, color: true } },
        participants: { include: { user: userSel } },
        attachments: true,
        _count: { select: { comments: true } },
      },
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        calendarId,
        userId: auth.id,
        action: "CREATED_EVENT",
        targetTitle: title,
        details: JSON.stringify({ eventId: event.id, startAt }),
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error("POST /api/events error:", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
