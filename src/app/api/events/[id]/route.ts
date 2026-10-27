import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertCanModifyEvent, handleError, requireMember, requireUser, HttpError } from "@/lib/auth";
import { eventInclude } from "@/lib/includes";
import { assertCalendarRefs, attachmentList, bad, date, httpUrl, idArray, str } from "@/lib/validate";

async function loadEvent(id: string) {
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true, calendarId: true, creatorId: true, title: true, startAt: true, endAt: true } });
  if (!event) throw new HttpError(404, "Event not found");
  return event;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const me = await requireUser(req);
    const found = await loadEvent(id);
    await requireMember(me.id, found.calendarId, "VIEWER");

    const event = await prisma.event.findUnique({ where: { id }, include: eventInclude });
    return NextResponse.json(event);
  } catch (error) {
    return handleError(error, "GET /api/events/[id]", "Failed to fetch event");
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const me = await requireUser(req);
    const existing = await loadEvent(id);
    const role = await requireMember(me.id, existing.calendarId, "MEMBER");
    assertCanModifyEvent(role, existing.creatorId, me.id);

    const body = await req.json();
    const title = str(body.title, "제목", 200);
    const startAt = body.startAt ? date(body.startAt, "시작 시간") : undefined;
    const endAt = body.endAt ? date(body.endAt, "종료 시간") : undefined;
    if ((endAt ?? existing.endAt) < (startAt ?? existing.startAt)) {
      bad("종료 시간은 시작 시간보다 빠를 수 없습니다.");
    }

    const labelId = body.labelId !== undefined ? str(body.labelId, "labelId", 100) : undefined;
    const participantIds = body.participantIds !== undefined ? idArray(body.participantIds, "참석자") : undefined;
    const attachments = body.attachments !== undefined ? attachmentList(body.attachments) : undefined;
    await assertCalendarRefs(existing.calendarId, participantIds ?? [], labelId ?? null);

    // One transaction so a failure can't leave the event with its attachments/participants wiped.
    const event = await prisma.$transaction(async (tx) => {
      if (attachments !== undefined) {
        await tx.eventAttachment.deleteMany({ where: { eventId: id } });
        if (attachments.length) {
          await tx.eventAttachment.createMany({ data: attachments.map((a) => ({ ...a, eventId: id })) });
        }
      }
      if (participantIds !== undefined) {
        await tx.eventParticipant.deleteMany({ where: { eventId: id } });
        if (participantIds.length) {
          await tx.eventParticipant.createMany({ data: participantIds.map((userId) => ({ eventId: id, userId })) });
        }
      }

      const updated = await tx.event.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(body.description !== undefined && { description: str(body.description, "설명", 5000) }),
          ...(body.location !== undefined && { location: str(body.location, "장소", 300) }),
          ...(body.url !== undefined && { url: httpUrl(body.url) }),
          ...(labelId !== undefined && { labelId }),
          ...(body.isAllDay !== undefined && { isAllDay: !!body.isAllDay }),
          ...(startAt && { startAt }),
          ...(endAt && { endAt }),
          ...(body.recurrenceRule !== undefined && { recurrenceRule: str(body.recurrenceRule, "반복 규칙", 500) }),
        },
        include: eventInclude,
      });

      await tx.activityLog.create({
        data: {
          calendarId: updated.calendarId,
          userId: me.id,
          action: "UPDATED_EVENT",
          targetTitle: updated.title,
          details: JSON.stringify({ eventId: updated.id }),
        },
      });
      return updated;
    });

    return NextResponse.json(event);
  } catch (error) {
    return handleError(error, "PUT /api/events/[id]", "Failed to update event");
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const me = await requireUser(req);
    const event = await loadEvent(id);
    const role = await requireMember(me.id, event.calendarId, "MEMBER");
    assertCanModifyEvent(role, event.creatorId, me.id);

    await prisma.$transaction([
      prisma.event.delete({ where: { id } }),
      prisma.activityLog.create({
        data: { calendarId: event.calendarId, userId: me.id, action: "DELETED_EVENT", targetTitle: event.title },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, "DELETE /api/events/[id]", "Failed to delete event");
  }
}
