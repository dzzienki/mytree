import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, requireMember, requireUser } from "@/lib/auth";
import { calendarInclude } from "@/lib/includes";
import { newInviteCode } from "@/lib/invite";

// Issues a fresh invite code; the previous link stops working immediately.
// Existing members are unaffected.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const me = await requireUser(req);
    await requireMember(me.id, id, "ADMIN");

    const calendar = await prisma.calendar.update({
      where: { id },
      data: { inviteCode: newInviteCode() },
      include: calendarInclude,
    });
    return NextResponse.json(calendar);
  } catch (error) {
    return handleError(error, "POST /api/calendars/[id]/invite", "Failed to regenerate invite link");
  }
}
