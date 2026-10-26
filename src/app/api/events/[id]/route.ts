import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, getMembership, forbidden, USER_PUBLIC_SELECT } from "@/lib/auth";

const userSel = { select: USER_PUBLIC_SELECT } as const;

const eventInclude = {
  label: true,
  creator: userSel,
  calendar: { select: { id: true, name: true, color: true } },
  participants: { include: { user: userSel } },
  attachments: true,
  comments: {
    include: { user: userSel },
    orderBy: { createdAt: "asc" },
  },
} as const;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser();
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: eventInclude,
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (!(await getMembership(event.calendarId, auth.id))) return forbidden();

    return NextResponse.json(event);
  } catch (error) {
    console.error("GET /api/events/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser();
    if (auth instanceof Response) return auth;

    const { id } = await params;
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (!(await getMembership(existing.calendarId, auth.id))) return forbidden();

    const body = await req.json();
    const {
      title,
      description,
      location,
      url,
      labelId,
      isAllDay,
      startAt,
      endAt,
      recurrenceRule,
      participantIds,
      attachments,
    } = body;

    // Only keep a label that belongs to this event's calendar
    let nextLabelId: string | null | undefined = undefined;
    if (labelId !== undefined) {
      const label = labelId
        ? await prisma.label.findFirst({
            where: { id: labelId, calendarId: existing.calendarId },
            select: { id: true },
          })
        : null;
      nextLabelId = label?.id ?? null;
    }

    // If attachments provided, update relation
    if (attachments !== undefined) {
      await prisma.eventAttachment.deleteMany({
        where: { eventId: id },
      });
      if (attachments.length > 0) {
        await prisma.eventAttachment.createMany({
          data: attachments.map((att: any) => ({
            eventId: id,
            fileUrl: att.fileUrl || att.url,
            fileName: att.fileName || "image.jpg",
            fileType: att.fileType || "image/jpeg",
          })),
        });
      }
    }

    // If participantIds provided, update relation (members of this calendar only)
    if (participantIds !== undefined) {
      const members = await prisma.calendarMember.findMany({
        where: { calendarId: existing.calendarId, userId: { in: participantIds } },
        select: { userId: true },
      });
      await prisma.eventParticipant.deleteMany({
        where: { eventId: id },
      });
      if (members.length > 0) {
        await prisma.eventParticipant.createMany({
          data: members.map((m) => ({ eventId: id, userId: m.userId })),
        });
      }
    }

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(location !== undefined && { location }),
        ...(url !== undefined && { url }),
        ...(nextLabelId !== undefined && { labelId: nextLabelId }),
        ...(isAllDay !== undefined && { isAllDay }),
        ...(startAt && { startAt: new Date(startAt) }),
        ...(endAt && { endAt: new Date(endAt) }),
        ...(recurrenceRule !== undefined && { recurrenceRule }),
      },
      include: eventInclude,
    });

    await prisma.activityLog.create({
      data: {
        calendarId: event.calendarId,
        userId: auth.id,
        action: "UPDATED_EVENT",
        targetTitle: event.title,
        details: JSON.stringify({ eventId: event.id }),
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error("PUT /api/events/[id] error:", error);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser();
    if (auth instanceof Response) return auth;

    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (!(await getMembership(event.calendarId, auth.id))) return forbidden();

    await prisma.event.delete({
      where: { id },
    });

    await prisma.activityLog.create({
      data: {
        calendarId: event.calendarId,
        userId: auth.id,
        action: "DELETED_EVENT",
        targetTitle: event.title,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/events/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
