import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const calendarId = searchParams.get("calendarId");

    const where: any = {};
    if (calendarId && calendarId !== "all") {
      where.calendarId = calendarId;
    }

    const items = await prisma.keepItem.findMany({
      where,
      include: {
        creator: true,
      },
      orderBy: [{ isCompleted: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/keep error:", error);
    return NextResponse.json({ error: "Failed to fetch keep items" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { calendarId, creatorId, title, content, isChecklist, color } = body;

    if (!calendarId || !creatorId || !title) {
      return NextResponse.json(
        { error: "Calendar ID, creator ID, and title are required" },
        { status: 400 }
      );
    }

    const item = await prisma.keepItem.create({
      data: {
        calendarId,
        creatorId,
        title,
        content: content || null,
        isChecklist: !!isChecklist,
        color: color || "#FEF3C7",
      },
      include: {
        creator: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        calendarId,
        userId: creatorId,
        action: "CREATED_KEEP",
        targetTitle: title,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("POST /api/keep error:", error);
    return NextResponse.json({ error: "Failed to create keep item" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, title, content, isCompleted, color } = body;

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const item = await prisma.keepItem.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content !== undefined && { content }),
        ...(isCompleted !== undefined && { isCompleted }),
        ...(color !== undefined && { color }),
      },
      include: {
        creator: true,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("PUT /api/keep error:", error);
    return NextResponse.json({ error: "Failed to update keep item" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    await prisma.keepItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/keep error:", error);
    return NextResponse.json({ error: "Failed to delete keep item" }, { status: 500 });
  }
}
