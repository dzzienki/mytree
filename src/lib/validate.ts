import { HttpError } from "./auth";
import { prisma } from "./prisma";

export const MIN_PASSWORD_LENGTH = 8;

export function bad(message: string): never {
  throw new HttpError(400, message);
}

export function str(value: unknown, field: string, max: number, required = false): string | null {
  if (value === undefined || value === null || value === "") {
    if (required) bad(`${field}을(를) 입력해 주세요.`);
    return null;
  }
  if (typeof value !== "string") bad(`${field} 형식이 올바르지 않습니다.`);
  const trimmed = (value as string).trim();
  if (required && !trimmed) bad(`${field}을(를) 입력해 주세요.`);
  if (trimmed.length > max) bad(`${field}은(는) ${max}자 이하여야 합니다.`);
  return trimmed || null;
}

export function date(value: unknown, field: string): Date {
  const d = new Date(value as string);
  if (typeof value !== "string" || Number.isNaN(d.getTime())) bad(`${field} 형식이 올바르지 않습니다.`);
  return d;
}

/** Only http(s) links are allowed — blocks javascript:/data: URLs rendered as <a href>. */
export function httpUrl(value: unknown, field = "URL"): string | null {
  const s = str(value, field, 2000);
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") bad(`${field}은(는) http(s) 주소여야 합니다.`);
    return u.toString();
  } catch (e) {
    if (e instanceof HttpError) throw e;
    return bad(`${field} 형식이 올바르지 않습니다.`);
  }
}

export function hexColor(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) bad("색상 형식이 올바르지 않습니다.");
  return value as string;
}

export function idArray(value: unknown, field: string, max = 100): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > max || value.some((v) => typeof v !== "string")) {
    bad(`${field} 형식이 올바르지 않습니다.`);
  }
  return Array.from(new Set(value as string[]));
}

/** Attachments must point at files this app uploaded. */
export function attachmentList(value: unknown) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 20) bad("첨부 파일 형식이 올바르지 않습니다.");
  return (value as Record<string, unknown>[]).map((att) => {
    const fileUrl = (att?.fileUrl ?? att?.url) as unknown;
    if (typeof fileUrl !== "string" || !/^\/uploads\/[\w.-]+$/.test(fileUrl)) {
      bad("첨부 파일 경로가 올바르지 않습니다.");
    }
    return {
      fileUrl: fileUrl as string,
      fileName: str(att.fileName, "파일 이름", 200) ?? "image",
      fileType: str(att.fileType, "파일 형식", 100) ?? "image/jpeg",
    };
  });
}

/** Participants and the label must belong to the event's calendar. */
export async function assertCalendarRefs(calendarId: string, participantIds: string[], labelId: string | null) {
  if (participantIds.length) {
    const count = await prisma.calendarMember.count({
      where: { calendarId, userId: { in: participantIds } },
    });
    if (count !== participantIds.length) bad("참석자는 캘린더 멤버여야 합니다.");
  }
  if (labelId) {
    const label = await prisma.label.findFirst({ where: { id: labelId, calendarId }, select: { id: true } });
    if (!label) bad("라벨이 올바르지 않습니다.");
  }
}

