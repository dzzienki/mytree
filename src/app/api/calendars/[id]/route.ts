import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const calendar = await prisma.calendar.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: true },
        },
        labels: {
          orderBy: { orderIndex: "asc" },
        },
      },
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
    const { id } = await params;
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
      include: {
        members: { include: { user: true } },
        labels: true,
      },
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
    const { id } = await params;
    await prisma.calendar.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/calendars/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete calendar" }, { status: 500 });
  }
}
