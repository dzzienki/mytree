import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        label: true,
        creator: true,
        calendar: { select: { id: true, name: true, color: true } },
        participants: { include: { user: true } },
        comments: {
          include: { user: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

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
    const { id } = await params;
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
      updaterId,
    } = body;

    // If participantIds provided, update relation
    if (participantIds !== undefined) {
      await prisma.eventParticipant.deleteMany({
        where: { eventId: id },
      });
      if (participantIds.length > 0) {
        await prisma.eventParticipant.createMany({
          data: participantIds.map((userId: string) => ({
            eventId: id,
            userId,
          })),
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
        ...(labelId !== undefined && { labelId: labelId || null }),
        ...(isAllDay !== undefined && { isAllDay }),
        ...(startAt && { startAt: new Date(startAt) }),
        ...(endAt && { endAt: new Date(endAt) }),
        ...(recurrenceRule !== undefined && { recurrenceRule }),
      },
      include: {
        label: true,
        creator: true,
        calendar: { select: { id: true, name: true, color: true } },
        participants: { include: { user: true } },
        comments: {
          include: { user: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (updaterId) {
      await prisma.activityLog.create({
        data: {
          calendarId: event.calendarId,
          userId: updaterId,
          action: "UPDATED_EVENT",
          targetTitle: event.title,
          details: JSON.stringify({ eventId: event.id }),
        },
      });
    }

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
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await prisma.event.delete({
      where: { id },
    });

    if (userId) {
      await prisma.activityLog.create({
        data: {
          calendarId: event.calendarId,
          userId,
          action: "DELETED_EVENT",
          targetTitle: event.title,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/events/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
