import { createHmac, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { getAppDataDirectory } from "@/lib/storage-path";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const filename = request.nextUrl.searchParams.get("file") ?? "";
  const expiresValue = request.nextUrl.searchParams.get("expires") ?? "";
  const signature = request.nextUrl.searchParams.get("signature") ?? "";
  const expires = Number(expiresValue);
  if (!secret || !/^terraland-backup-[\w-]+\.terraland-backup\.gz$/.test(filename) || !Number.isSafeInteger(expires) || expires < Date.now() || !/^[a-f\d]{64}$/i.test(signature)) {
    return NextResponse.json({ error: "This backup link is invalid or has expired." }, { status: 403 });
  }
  const payload = `${filename}.${expires}`;
  const expected = createHmac("sha256", secret).update(payload).digest();
  const supplied = Buffer.from(signature, "hex");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return NextResponse.json({ error: "This backup link is invalid or has expired." }, { status: 403 });
  }
  const filePath = path.join(getAppDataDirectory(), "daily-backups", filename);
  try {
    await stat(filePath);
    return new NextResponse(Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "This backup has expired or is no longer available." }, { status: 404 });
  }
}
