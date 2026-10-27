import path from "path";

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
