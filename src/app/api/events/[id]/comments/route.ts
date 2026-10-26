import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, getMembership, forbidden, USER_PUBLIC_SELECT } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser();
    if (auth instanceof Response) return auth;

    const { id: eventId } = await params;
    const body = await req.json();
    const { content } = body;

    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (!(await getMembership(event.calendarId, auth.id))) return forbidden();

    const comment = await prisma.eventComment.create({
      data: {
        eventId,
        userId: auth.id,
        content: content.trim(),
      },
      include: {
        user: { select: USER_PUBLIC_SELECT },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        calendarId: event.calendarId,
        userId: auth.id,
        action: "COMMENTED",
        targetTitle: event.title,
        details: JSON.stringify({ commentId: comment.id, content: content.slice(0, 50) }),
      },
    });

    return NextResponse.json(comment);
  } catch (error) {
    console.error("POST /api/events/[id]/comments error:", error);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}
