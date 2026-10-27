import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import { handleError, requireUser } from "@/lib/auth";
import { HttpError } from "@/lib/auth";
import { UPLOAD_DIR } from "@/lib/uploads";

const MAX_BYTES = 5 * 1024 * 1024;

// SVG is deliberately NOT allowed: it can embed <script> and would run on our origin.
// The extension is derived from the *detected* file type, never from the client's file name.
function detectImage(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: ".jpg", mime: "image/jpeg" };
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: ".png", mime: "image/png" };
  if (buf.length >= 6 && ["GIF87a", "GIF89a"].includes(buf.subarray(0, 6).toString("latin1"))) return { ext: ".gif", mime: "image/gif" };
  if (buf.length >= 12 && buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return { ext: ".webp", mime: "image/webp" };
  return null;
}

export async function POST(req: Request) {
  try {
    await requireUser(req);

    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES + 64 * 1024) throw new HttpError(413, "파일이 너무 큽니다. (최대 5MB)");

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "No file uploaded");
    if (file.size > MAX_BYTES) throw new HttpError(413, "파일이 너무 큽니다. (최대 5MB)");

    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = detectImage(buffer);
    if (!detected) throw new HttpError(400, "Only image files (JPEG, PNG, WebP, GIF) are supported");

    await mkdir(UPLOAD_DIR, { recursive: true });
    const uniqueName = `${randomUUID()}${detected.ext}`;
    await writeFile(path.join(UPLOAD_DIR, uniqueName), buffer);

    return NextResponse.json({
      url: `/uploads/${uniqueName}`,
      fileName: path.basename(file.name).slice(0, 200),
      fileType: detected.mime,
    });
  } catch (error) {
    return handleError(error, "POST /api/upload", "Failed to upload file");
  }
}
