import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, getMembership, forbidden, USER_PUBLIC_SELECT } from "@/lib/auth";

const calendarInclude = {
  members: { include: { user: { select: USER_PUBLIC_SELECT } } },
  labels: { orderBy: { orderIndex: "asc" } },
} as const;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser();
    if (auth instanceof Response) return auth;

    const { id } = await params;
    if (!(await getMembership(id, auth.id))) return forbidden();

    const calendar = await prisma.calendar.findUnique({
      where: { id },
      include: calendarInclude,
    });

    if (!calendar) {
      return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
    }

    return NextResponse.json(calendar);
  } catch (error) {
    console.error("GET /api/calendars/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch calendar" }, { status: 500 });
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
    const membership = await getMembership(id, auth.id);
    if (!membership) return forbidden();
    if (membership.role !== "OWNER") return forbidden("캘린더 소유자만 수정할 수 있습니다.");

    const body = await req.json();
    const { name, description, color, firstDayOfWeek } = body;

    const calendar = await prisma.calendar.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        ...(firstDayOfWeek !== undefined && { firstDayOfWeek }),
      },
      include: calendarInclude,
    });

    return NextResponse.json(calendar);
  } catch (error) {
    console.error("PUT /api/calendars/[id] error:", error);
    return NextResponse.json({ error: "Failed to update calendar" }, { status: 500 });
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
    const membership = await getMembership(id, auth.id);
    if (!membership) return forbidden();
    if (membership.role !== "OWNER") return forbidden("캘린더 소유자만 삭제할 수 있습니다.");

    await prisma.calendar.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/calendars/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete calendar" }, { status: 500 });
  }
}
