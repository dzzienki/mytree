import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, requireMember, requireUser } from "@/lib/auth";
import { calendarInclude } from "@/lib/includes";
import { bad, hexColor, str } from "@/lib/validate";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const me = await requireUser(req);
    await requireMember(me.id, id, "VIEWER");

    const calendar = await prisma.calendar.findUnique({ where: { id }, include: calendarInclude });
    if (!calendar) return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
    return NextResponse.json(calendar);
  } catch (error) {
    return handleError(error, "GET /api/calendars/[id]", "Failed to fetch calendar");
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const me = await requireUser(req);
    await requireMember(me.id, id, "ADMIN");

    const body = await req.json();
    const name = str(body.name, "캘린더 이름", 50);
    const color = hexColor(body.color);
    const { firstDayOfWeek } = body;
    if (firstDayOfWeek !== undefined && firstDayOfWeek !== 0 && firstDayOfWeek !== 1) {
      bad("firstDayOfWeek 값이 올바르지 않습니다.");
    }

    const calendar = await prisma.calendar.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(body.description !== undefined && { description: str(body.description, "설명", 500) }),
        ...(color && { color }),
        ...(firstDayOfWeek !== undefined && { firstDayOfWeek }),
      },
      include: calendarInclude,
    });

    return NextResponse.json(calendar);
  } catch (error) {
    return handleError(error, "PUT /api/calendars/[id]", "Failed to update calendar");
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const me = await requireUser(req);
    await requireMember(me.id, id, "OWNER");

    await prisma.calendar.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, "DELETE /api/calendars/[id]", "Failed to delete calendar");
  }
}
