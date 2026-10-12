import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { ensurePropertyUploadDirectory } from "@/lib/property-images";

export const runtime = "nodejs";

const contentTypes: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  mp4: "video/mp4", webm: "video/webm",
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) return new NextResponse(null, { status: 404 });
  const extension = path.extname(filename).slice(1).toLowerCase();
  const contentType = contentTypes[extension];
  if (!contentType) return new NextResponse(null, { status: 404 });

  const filePath = path.join(await ensurePropertyUploadDirectory(), filename);
  let fileStat;
  try { fileStat = await stat(filePath); } catch { return new NextResponse(null, { status: 404 }); }
  if (!fileStat.isFile()) return new NextResponse(null, { status: 404 });

  const range = request.headers.get("range");
  const match = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (range && !match) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${fileStat.size}` } });
  let start = 0;
  let end = fileStat.size - 1;
  if (match) {
    if (!match[1] && match[2]) start = Math.max(0, fileStat.size - Number(match[2]));
    else start = Number(match[1] || 0);
    if (match[1] && match[2]) end = Math.min(end, Number(match[2]));
    if (start >= fileStat.size || end < start) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${fileStat.size}` } });
  }
  const partial = Boolean(match);
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Content-Length": String(end - start + 1),
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  if (partial) headers.set("Content-Range", `bytes ${start}-${end}/${fileStat.size}`);
  const stream = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream<Uint8Array>;
  return new NextResponse(stream, { status: partial ? 206 : 200, headers });
}
