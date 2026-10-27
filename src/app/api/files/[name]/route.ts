import { readFile } from "fs/promises";
import path from "path";
import { HttpError, handleError, requireUser } from "@/lib/auth";
import { IMAGE_MIME, STORED_NAME_RE, UPLOAD_DIR } from "@/lib/uploads";

// Serves uploaded images to logged-in users. Reached as /uploads/<name> through the rewrite in next.config.ts.
export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    await requireUser(req);
    const { name } = await params;
    if (!STORED_NAME_RE.test(name)) throw new HttpError(404, "Not found");

    let data: Buffer;
    try {
      data = await readFile(path.join(UPLOAD_DIR, name));
    } catch {
      throw new HttpError(404, "Not found");
    }

    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": IMAGE_MIME[path.extname(name)],
        "Content-Length": String(data.length),
        "X-Content-Type-Options": "nosniff",
        // Names are random and never reused, so the browser may cache; "private" keeps shared caches out.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return handleError(error, "GET /api/files/[name]", "Failed to load file");
  }
}
