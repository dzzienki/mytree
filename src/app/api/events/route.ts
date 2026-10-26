import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleError, memberCalendarIds, requireMember, requireUser } from "@/lib/auth";
import { eventInclude } from "@/lib/includes";
import { assertCalendarRefs, attachmentList, bad, date, httpUrl, idArray, str } from "@/lib/validate";

export async function GET(req: Request) {
  try {
    const me = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const calendarId = searchParams.get("calendarId");

    const where: Prisma.EventWhereInput = {};

    if (calendarId && calendarId !== "all") {
      await requireMember(me.id, calendarId, "VIEWER");
      where.calendarId = calendarId;
    } else {
      where.calendarId = { in: await memberCalendarIds(me.id) };
    }

    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");
    if (startParam && endParam) {
      const start = date(startParam, "startDate");
      const end = date(endParam, "endDate");
      where.OR = [
        { startAt: { gte: start, lte: end } },
        { endAt: { gte: start, lte: end } },
        { AND: [{ startAt: { lte: start } }, { endAt: { gte: end } }] },
      ];
    }

    const events = await prisma.event.findMany({
      where,
      include: eventInclude,
      orderBy: { startAt: "asc" },
    });

    return NextResponse.json(events);
  } catch (error) {
    return handleError(error, "GET /api/events", "Failed to fetch events");
  }
}

export async function POST(req: Request) {
  try {
    const me = await requireUser(req);
    const body = await req.json();

    const calendarId = str(body.calendarId, "calendarId", 100, true)!;
    await requireMember(me.id, calendarId, "MEMBER");

    const title = str(body.title, "제목", 200, true)!;
    const startAt = date(body.startAt, "시작 시간");
    const endAt = date(body.endAt, "종료 시간");
    if (endAt < startAt) bad("종료 시간은 시작 시간보다 빠를 수 없습니다.");

    const labelId = str(body.labelId, "labelId", 100);
    const participantIds = idArray(body.participantIds, "참석자");
    await assertCalendarRefs(calendarId, participantIds, labelId);

    const event = await prisma.event.create({
      data: {
        calendarId,
        creatorId: me.id,
        labelId,
        title,
        description: str(body.description, "설명", 5000),
        location: str(body.location, "장소", 300),
        url: httpUrl(body.url),
        isAllDay: !!body.isAllDay,
        startAt,
        endAt,
        recurrenceRule: str(body.recurrenceRule, "반복 규칙", 500),
        participants: { create: participantIds.map((userId) => ({ userId })) },
        attachments: { create: attachmentList(body.attachments) },
      },
      include: eventInclude,
    });

    await prisma.activityLog.create({
      data: {
        calendarId,
        userId: me.id,
        action: "CREATED_EVENT",
        targetTitle: title,
        details: JSON.stringify({ eventId: event.id, startAt }),
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    return handleError(error, "POST /api/events", "Failed to create event");
  }
}
