import { unlink } from "fs/promises";
import path from "path";
import { prisma } from "./prisma";

// Uploaded images live outside the web root and are served by GET /api/files/[name]
// (login required), so no nginx/file-permission setup is needed for them.
// Set UPLOAD_DIR to an absolute path outside the home folder in production, e.g. /var/lib/mytree/uploads.
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");

export const IMAGE_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

/** Names we generate: a UUID plus a detected image extension. Anything else is rejected (no path traversal). */
export const STORED_NAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|gif|webp)$/;

/**
 * Removes uploaded files that no record points at any more. Call after the DB change has committed.
 * Failures are ignored on purpose: a leftover file is harmless, a failed request is not.
 */
export async function deleteUnusedUploads(fileUrls: string[]) {
  for (const url of new Set(fileUrls)) {
    const name = url.startsWith("/uploads/") ? url.slice("/uploads/".length) : "";
    if (!STORED_NAME_RE.test(name)) continue;
    try {
      const [keep, event, avatar] = await Promise.all([
        prisma.keepAttachment.count({ where: { fileUrl: url } }),
        prisma.eventAttachment.count({ where: { fileUrl: url } }),
        prisma.user.count({ where: { avatarUrl: url } }),
      ]);
      if (keep + event + avatar === 0) await unlink(path.join(UPLOAD_DIR, name));
    } catch {
      // already gone or not removable
    }
  }
}
