import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const body = await req.json();
    const { userId, content } = body;

    if (!userId || !content?.trim()) {
      return NextResponse.json(
        { error: "User ID and comment content are required" },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const comment = await prisma.eventComment.create({
      data: {
        eventId,
        userId,
        content: content.trim(),
      },
      include: {
        user: true,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        calendarId: event.calendarId,
        userId,
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
