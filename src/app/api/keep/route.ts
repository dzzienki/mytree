import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PUBLIC_USER_SELECT, handleError, memberCalendarIds, requireMember, requireUser, HttpError } from "@/lib/auth";
import { hexColor, str } from "@/lib/validate";

const include = {
  creator: { select: PUBLIC_USER_SELECT },
  calendar: { select: { id: true, name: true, color: true } },
};

async function loadItem(id: unknown) {
  if (typeof id !== "string" || !id) throw new HttpError(400, "Item ID is required");
  const item = await prisma.keepItem.findUnique({ where: { id }, select: { id: true, calendarId: true } });
  if (!item) throw new HttpError(404, "Item not found");
  return item;
}

export async function GET(req: Request) {
  try {
    const me = await requireUser(req);
    const calendarId = new URL(req.url).searchParams.get("calendarId");

    let calendarFilter: string | { in: string[] };
    if (calendarId && calendarId !== "all") {
      await requireMember(me.id, calendarId, "VIEWER");
      calendarFilter = calendarId;
    } else {
      calendarFilter = { in: await memberCalendarIds(me.id) };
    }

    const items = await prisma.keepItem.findMany({
      where: { calendarId: calendarFilter },
      include,
      orderBy: [{ isCompleted: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(items);
  } catch (error) {
    return handleError(error, "GET /api/keep", "Failed to fetch keep items");
  }
}

export async function POST(req: Request) {
  try {
    const me = await requireUser(req);
    const body = await req.json();
    const calendarId = str(body.calendarId, "calendarId", 100, true)!;
    await requireMember(me.id, calendarId, "MEMBER");
    const title = str(body.title, "제목", 200, true)!;

    const item = await prisma.keepItem.create({
      data: {
        calendarId,
        creatorId: me.id,
        title,
        content: str(body.content, "내용", 10000),
        isChecklist: !!body.isChecklist,
        color: hexColor(body.color) || "#FEF3C7",
      },
      include,
    });

    await prisma.activityLog.create({
      data: { calendarId, userId: me.id, action: "CREATED_KEEP", targetTitle: title },
    });

    return NextResponse.json(item);
  } catch (error) {
    return handleError(error, "POST /api/keep", "Failed to create keep item");
  }
}

export async function PUT(req: Request) {
  try {
    const me = await requireUser(req);
    const body = await req.json();
    const existing = await loadItem(body.id);
    await requireMember(me.id, existing.calendarId, "MEMBER");

    const title = str(body.title, "제목", 200);
    const item = await prisma.keepItem.update({
      where: { id: existing.id },
      data: {
        ...(title && { title }),
        ...(body.content !== undefined && { content: str(body.content, "내용", 10000) }),
        ...(body.isCompleted !== undefined && { isCompleted: !!body.isCompleted }),
        ...(body.color !== undefined && { color: hexColor(body.color) }),
      },
      include,
    });
    return NextResponse.json(item);
  } catch (error) {
    return handleError(error, "PUT /api/keep", "Failed to update keep item");
  }
}

export async function DELETE(req: Request) {
  try {
    const me = await requireUser(req);
    const existing = await loadItem(new URL(req.url).searchParams.get("id"));
    await requireMember(me.id, existing.calendarId, "MEMBER");

    await prisma.keepItem.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, "DELETE /api/keep", "Failed to delete keep item");
  }
}
