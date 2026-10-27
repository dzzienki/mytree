import { createHash, randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { HttpError } from "./auth";

/** 128-bit random, URL-safe. Unlike the default cuid it can't be guessed from timing/counters. */
export function newInviteCode(): string {
  return randomBytes(16).toString("base64url");
}

export const ONE_TIME_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const MAX_ACTIVE_ONE_TIME_LINKS = 20;

/** One-time codes are stored hashed so a database leak can't be turned into working links. */
export function hashInviteCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Looks a code up as either a calendar's permanent invite code or an unused, unexpired
 * one-time link. Does not consume anything.
 */
export async function resolveInvite(code: string) {
  const permanent = await prisma.calendar.findUnique({ where: { inviteCode: code } });
  if (permanent) return { calendar: permanent, oneTimeLinkId: null as string | null };

  const link = await prisma.inviteLink.findUnique({
    where: { codeHash: hashInviteCode(code) },
    include: { calendar: true },
  });
  if (link && !link.usedAt && link.expiresAt > new Date()) {
    return { calendar: link.calendar, oneTimeLinkId: link.id as string | null };
  }
  return null;
}

/**
 * Marks a one-time link as used. The conditional update makes this atomic: when two people
 * open the same link at once, exactly one wins and the other gets a 410.
 * Call inside the transaction that creates the membership so a failure doesn't burn the link.
 */
export async function consumeOneTimeLink(tx: Prisma.TransactionClient, linkId: string, userId: string) {
  const result = await tx.inviteLink.updateMany({
    where: { id: linkId, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date(), usedById: userId },
  });
  if (result.count !== 1) throw new HttpError(410, "이미 사용되었거나 만료된 초대 링크입니다.");
}
