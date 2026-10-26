import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const calendarId = searchParams.get("calendarId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
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
        creator: true,
        calendar: {
          select: { id: true, name: true, color: true },
        },
        participants: {
          include: { user: true },
        },
        attachments: true,
        comments: {
          include: { user: true },
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
    const body = await req.json();
    const {
      calendarId,
      creatorId,
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

    if (!calendarId || !creatorId || !title || !startAt || !endAt) {
      return NextResponse.json(
        { error: "Required fields are missing (calendarId, creatorId, title, startAt, endAt)" },
        { status: 400 }
      );
    }

    const event = await prisma.event.create({
      data: {
        calendarId,
        creatorId,
        labelId: labelId || null,
        title,
        description: description || null,
        location: location || null,
        url: url || null,
        isAllDay: !!isAllDay,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        recurrenceRule: recurrenceRule || null,
        participants: {
          create: participantIds.map((userId: string) => ({ userId })),
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
        creator: true,
        calendar: { select: { id: true, name: true, color: true } },
        participants: { include: { user: true } },
        attachments: true,
        _count: { select: { comments: true } },
      },
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        calendarId,
        userId: creatorId,
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
