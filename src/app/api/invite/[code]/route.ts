import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, requireUser } from "@/lib/auth";
import { consumeOneTimeLink, resolveInvite } from "@/lib/invite";

// Accepts both a calendar's permanent code and a single-use link code.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const invite = await resolveInvite(code);
    if (!invite) {
      return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
    }

    // Deliberately no inviteCode here: a one-time link must never reveal the permanent one.
    const calendar = await prisma.calendar.findUnique({
      where: { id: invite.calendar.id },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        _count: { select: { members: true, events: true } },
      },
    });

    return NextResponse.json({ ...calendar, oneTime: invite.oneTimeLinkId !== null });
  } catch (error) {
    return handleError(error, "GET /api/invite/[code]", "Failed to process invite");
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const me = await requireUser(req);

    const invite = await resolveInvite(code);
    if (!invite) {
      return NextResponse.json({ error: "유효하지 않거나 이미 사용된 초대 링크입니다." }, { status: 404 });
    }
    const { calendar, oneTimeLinkId } = invite;

    // Already a member: succeed without spending a one-time link.
    const existing = await prisma.calendarMember.findUnique({
      where: { calendarId_userId: { calendarId: calendar.id, userId: me.id } },
    });
    if (existing) {
      return NextResponse.json({ message: "Already a member", calendarId: calendar.id });
    }

    const member = await prisma.$transaction(async (tx) => {
      if (oneTimeLinkId) await consumeOneTimeLink(tx, oneTimeLinkId, me.id);
      return tx.calendarMember.create({
        data: { calendarId: calendar.id, userId: me.id, role: "MEMBER" },
      });
    });

    return NextResponse.json({ success: true, calendarId: calendar.id, member });
  } catch (error) {
    return handleError(error, "POST /api/invite/[code]", "Failed to join calendar");
  }
}
