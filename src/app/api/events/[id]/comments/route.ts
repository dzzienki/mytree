import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, requireMember, requireUser, HttpError, PUBLIC_USER_SELECT } from "@/lib/auth";
import { str } from "@/lib/validate";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const me = await requireUser(req);

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new HttpError(404, "Event not found");
    await requireMember(me.id, event.calendarId, "MEMBER");

    const body = await req.json();
    const content = str(body.content, "댓글", 1000, true)!;

    const comment = await prisma.eventComment.create({
      data: { eventId, userId: me.id, content },
      include: { user: { select: PUBLIC_USER_SELECT } },
    });

    await prisma.activityLog.create({
      data: {
        calendarId: event.calendarId,
        userId: me.id,
        action: "COMMENTED",
        targetTitle: event.title,
        details: JSON.stringify({ commentId: comment.id, content: content.slice(0, 50) }),
      },
    });

    return NextResponse.json(comment);
  } catch (error) {
    return handleError(error, "POST /api/events/[id]/comments", "Failed to add comment");
  }
}
