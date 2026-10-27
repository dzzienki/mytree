import { randomBytes } from "crypto";

/** 128-bit random, URL-safe. Unlike the default cuid it can't be guessed from timing/counters. */
export function newInviteCode(): string {
  return randomBytes(16).toString("base64url");
}
