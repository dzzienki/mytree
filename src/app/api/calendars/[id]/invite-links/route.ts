import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, handleError, requireMember, requireUser } from "@/lib/auth";
import {
  MAX_ACTIVE_ONE_TIME_LINKS,
  ONE_TIME_LINK_TTL_MS,
  hashInviteCode,
  newInviteCode,
} from "@/lib/invite";

// Creates a single-use invite link (valid 7 days, one person). The plain code is returned
// only here; the database keeps just its hash. Any member may create one, matching who can
// already see the calendar's permanent link.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const me = await requireUser(req);
    await requireMember(me.id, id, "MEMBER");

    const now = new Date();
    // Housekeeping: drop links that expired more than 30 days ago.
    await prisma.inviteLink.deleteMany({
      where: { calendarId: id, expiresAt: { lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
    });

    const active = await prisma.inviteLink.count({
      where: { calendarId: id, usedAt: null, expiresAt: { gt: now } },
    });
    if (active >= MAX_ACTIVE_ONE_TIME_LINKS) {
      throw new HttpError(429, `사용 전인 일회용 링크가 너무 많습니다. (최대 ${MAX_ACTIVE_ONE_TIME_LINKS}개)`);
    }

    const code = newInviteCode();
    const expiresAt = new Date(now.getTime() + ONE_TIME_LINK_TTL_MS);
    await prisma.inviteLink.create({
      data: { calendarId: id, codeHash: hashInviteCode(code), createdById: me.id, expiresAt },
    });

    return NextResponse.json({ code, expiresAt });
  } catch (error) {
    return handleError(error, "POST /api/calendars/[id]/invite-links", "Failed to create invite link");
  }
}
