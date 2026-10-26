import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, getMembership, forbidden, USER_PUBLIC_SELECT } from "@/lib/auth";

const creatorSel = { select: USER_PUBLIC_SELECT } as const;

export async function GET(req: Request) {
  try {
    const auth = await requireUser();
    if (auth instanceof Response) return auth;

    const { searchParams } = new URL(req.url);
    const calendarId = searchParams.get("calendarId");

    const where: any = {};
    if (calendarId && calendarId !== "all") {
      if (!(await getMembership(calendarId, auth.id))) return forbidden();
      where.calendarId = calendarId;
    } else {
      where.calendar = { members: { some: { userId: auth.id } } };
    }

    const items = await prisma.keepItem.findMany({
      where,
      include: {
        creator: creatorSel,
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
    const auth = await requireUser();
    if (auth instanceof Response) return auth;

    const body = await req.json();
    const { calendarId, title, content, isChecklist, color } = body;

    if (!calendarId || !title) {
      return NextResponse.json(
        { error: "Calendar ID and title are required" },
        { status: 400 }
      );
    }
    if (!(await getMembership(calendarId, auth.id))) return forbidden();

    const item = await prisma.keepItem.create({
      data: {
        calendarId,
        creatorId: auth.id,
        title,
        content: content || null,
        isChecklist: !!isChecklist,
        color: color || "#FEF3C7",
      },
      include: {
        creator: creatorSel,
      },
    });

    await prisma.activityLog.create({
      data: {
        calendarId,
        userId: auth.id,
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
    const auth = await requireUser();
    if (auth instanceof Response) return auth;

    const body = await req.json();
    const { id, title, content, isCompleted, color } = body;

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const existing = await prisma.keepItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (!(await getMembership(existing.calendarId, auth.id))) return forbidden();

    const item = await prisma.keepItem.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content !== undefined && { content }),
        ...(isCompleted !== undefined && { isCompleted }),
        ...(color !== undefined && { color }),
      },
      include: {
        creator: creatorSel,
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
    const auth = await requireUser();
    if (auth instanceof Response) return auth;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const existing = await prisma.keepItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (!(await getMembership(existing.calendarId, auth.id))) return forbidden();

    await prisma.keepItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/keep error:", error);
    return NextResponse.json({ error: "Failed to delete keep item" }, { status: 500 });
  }
}
