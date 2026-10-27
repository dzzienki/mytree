import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, handleError, requireMember, requireUser } from "@/lib/auth";
import { calendarInclude } from "@/lib/includes";

// Removes a member from a calendar. Owners/admins only; the owner can't be removed and
// only an owner can remove an admin. The removed person's events and comments stay,
// but they lose access immediately and are dropped from event participant lists.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId } = await params;
    const me = await requireUser(req);
    const myRole = await requireMember(me.id, id, "ADMIN");

    if (userId === me.id) throw new HttpError(400, "자기 자신은 내보낼 수 없습니다.");

    const target = await prisma.calendarMember.findUnique({
      where: { calendarId_userId: { calendarId: id, userId } },
      select: { role: true },
    });
    if (!target) throw new HttpError(404, "멤버를 찾을 수 없습니다.");
    if (target.role === "OWNER") throw new HttpError(400, "방장은 내보낼 수 없습니다.");
    if (target.role === "ADMIN" && myRole !== "OWNER") {
      throw new HttpError(403, "관리자는 방장만 내보낼 수 있습니다.");
    }

    await prisma.$transaction([
      prisma.eventParticipant.deleteMany({ where: { userId, event: { calendarId: id } } }),
      prisma.calendarMember.delete({ where: { calendarId_userId: { calendarId: id, userId } } }),
    ]);

    const calendar = await prisma.calendar.findUnique({ where: { id }, include: calendarInclude });
    return NextResponse.json(calendar);
  } catch (error) {
    return handleError(error, "DELETE /api/calendars/[id]/members/[userId]", "Failed to remove member");
  }
}
