import { createHmac } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { NextResponse } from "next/server";
import { getAppDataDirectory } from "@/lib/storage-path";

export const runtime = "nodejs";
export const maxDuration = 300;

const recipient = "pavansai580@gmail.com";
const sevenDays = 7 * 24 * 60 * 60 * 1000;

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!siteUrl || !apiKey || !from) {
    return NextResponse.json({ error: "Set NEXT_PUBLIC_SITE_URL, RESEND_API_KEY, and EMAIL_FROM." }, { status: 503 });
  }

  const backupDirectory = path.join(getAppDataDirectory(), "daily-backups");
  await mkdir(backupDirectory, { recursive: true });
  const createdAt = new Date();
  const date = createdAt.toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const filename = `terraland-backup-${date}.terraland-backup.gz`;
  const backupPath = path.join(backupDirectory, filename);
  try {
    const response = await fetch(`${siteUrl}/api/admin/backup`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5 * 60 * 1000),
    });
    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => "");
      throw new Error(detail || `Backup endpoint returned ${response.status}.`);
    }
    await pipeline(Readable.fromWeb(response.body as never), createWriteStream(backupPath, { flags: "wx" }));
    const backupStat = await stat(backupPath);
    const expires = Date.now() + sevenDays;
    const tokenPayload = `${filename}.${expires}`;
    const signature = sign(tokenPayload, secret);
    const downloadUrl = `${siteUrl}/api/backup-download?file=${encodeURIComponent(filename)}&expires=${expires}&signature=${signature}`;
    const sizeMb = (backupStat.size / (1024 * 1024)).toFixed(1);
    const email = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: `NILAY daily backup · ${createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
        text: `Your daily Terraland backup is ready (${sizeMb} MB). Download it within 7 days: ${downloadUrl}\n\nThe backup includes the site database and listing photos/videos.`,
        html: `<p>Your daily Terraland backup is ready (${sizeMb} MB).</p><p><a href="${downloadUrl}">Download the backup</a>. This secure link expires in 7 days.</p><p>Includes the site database and listing photos/videos.</p>`,
      }),
    });
    if (!email.ok) throw new Error(`Backup email failed (${email.status}): ${(await email.text()).slice(0, 500)}`);

    const entries = await readdir(backupDirectory, { withFileTypes: true });
    await Promise.all(entries.filter((entry) => entry.isFile() && entry.name.endsWith(".terraland-backup.gz") && entry.name !== filename)
      .map(async (entry) => {
        const filePath = path.join(backupDirectory, entry.name);
        if (Date.now() - (await stat(filePath)).mtimeMs > sevenDays) await rm(filePath, { force: true });
      }));
    return NextResponse.json({ message: "Daily backup created and emailed.", sizeBytes: backupStat.size });
  } catch (error) {
    await rm(backupPath, { force: true });
    const message = error instanceof Error ? error.message : "Daily backup failed.";
    console.error("Daily backup failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
