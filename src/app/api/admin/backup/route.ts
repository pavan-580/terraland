import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import Database from "better-sqlite3";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAppDataDirectory, getPropertyUploadDirectory } from "@/lib/storage-path";
import { ensurePropertyUploadDirectory } from "@/lib/property-images";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 300;

const BACKUP_FORMAT = "terraland-backup";
const BACKUP_VERSION = 1;
const MAX_BACKUP_BYTES = 1024 * 1024 * 1024;
const MEDIA_FILENAME = /^(?!\.{1,2}$)[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp|mp4|webm)$/i;

type BackupFile = { filename: string; sha256: string; data: string };
type BackupManifest = {
  format: string;
  version: number;
  createdAt: string;
  database: { sha256: string; data: string };
  uploads: BackupFile[];
};

function sha256(data: Buffer) {
  return createHash("sha256").update(data).digest("hex");
}

function getReferencedUploadNames(database: Database.Database) {
  const referenced = new Set<string>();
  const rows = database.prepare("SELECT image, images, videos FROM properties").all() as { image: unknown; images: unknown; videos: unknown }[];
  const addUrl = (value: unknown) => {
    if (typeof value !== "string" || !value.startsWith("/uploads/")) return;
    const filename = value.slice("/uploads/".length);
    if (!MEDIA_FILENAME.test(filename)) throw new Error(`A listing contains an invalid uploaded media path: ${value}`);
    referenced.add(filename);
  };
  for (const row of rows) {
    addUrl(row.image);
    for (const field of [row.images, row.videos]) {
      if (typeof field !== "string") continue;
      try {
        const values: unknown = JSON.parse(field);
        if (Array.isArray(values)) values.forEach(addUrl);
      } catch { /* The legacy image field above remains the fallback for malformed arrays. */ }
    }
  }
  return referenced;
}

function ensureReferencedMediaExists(referenced: Set<string>, available: Set<string>) {
  const missing = [...referenced].filter((filename) => !available.has(filename));
  if (missing.length) throw new Error(`Backup is missing ${missing.length} listing media file(s), including ${missing[0]}. No data was restored.`);
}

function isBase64(value: unknown): value is string {
  return typeof value === "string" && value.length % 4 === 0 && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value);
}

async function isAdmin() {
  return (await currentUser())?.role === "admin";
}

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "terraland-backup-"));
  const databaseCopyPath = path.join(tempDirectory, "landmark.db");
  try {
    await db.backup(databaseCopyPath);
    const database = await readFile(databaseCopyPath);
    const uploadDirectory = await ensurePropertyUploadDirectory();
    const uploads: BackupFile[] = [];
    for (const entry of await readdir(uploadDirectory, { withFileTypes: true })) {
      if (!entry.isFile() || !MEDIA_FILENAME.test(entry.name)) continue;
      const content = await readFile(path.join(uploadDirectory, entry.name));
      uploads.push({ filename: entry.name, sha256: sha256(content), data: content.toString("base64") });
    }
    const snapshotDb = new Database(databaseCopyPath, { readonly: true, fileMustExist: true });
    try {
      ensureReferencedMediaExists(getReferencedUploadNames(snapshotDb), new Set(uploads.map(({ filename }) => filename)));
    } finally {
      snapshotDb.close();
    }

    const manifest: BackupManifest = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      database: { sha256: sha256(database), data: database.toString("base64") },
      uploads,
    };
    const archive = gzipSync(Buffer.from(JSON.stringify(manifest)), { level: 6 });
    if (archive.byteLength > MAX_BACKUP_BYTES) {
      return NextResponse.json({ error: "This backup is larger than the supported 1 GB download size." }, { status: 413 });
    }
    return new NextResponse(archive, {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="terraland-backup-${new Date().toISOString().slice(0, 10)}.terraland-backup.gz"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "The backup could not be created.";
    return NextResponse.json({ error: message }, { status: message.startsWith("Backup is missing") || message.startsWith("A listing contains") ? 409 : 500 });
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

function validateManifest(value: unknown): BackupManifest {
  if (!value || typeof value !== "object") throw new Error("This file is not a Terraland backup.");
  const manifest = value as Partial<BackupManifest>;
  if (manifest.format !== BACKUP_FORMAT || manifest.version !== BACKUP_VERSION ||
    typeof manifest.createdAt !== "string" || !Number.isFinite(Date.parse(manifest.createdAt)) ||
    !manifest.database || typeof manifest.database !== "object" || !isBase64(manifest.database.data) ||
    !/^[a-f0-9]{64}$/.test(manifest.database.sha256) || !Array.isArray(manifest.uploads)) {
    throw new Error("The backup format is invalid or not supported by this version of Terraland.");
  }
  if (manifest.uploads.length > 100_000) throw new Error("The backup contains too many media files.");
  for (const file of manifest.uploads) {
    if (!file || typeof file !== "object" || !MEDIA_FILENAME.test(file.filename) ||
      !isBase64(file.data) || !/^[a-f0-9]{64}$/.test(file.sha256)) {
      throw new Error("The backup contains an invalid media file entry.");
    }
  }
  if (new Set(manifest.uploads.map((file) => file.filename)).size !== manifest.uploads.length) {
    throw new Error("The backup contains duplicate media filenames.");
  }
  return manifest as BackupManifest;
}

function restoreDatabase(backupPath: string) {
  db.prepare("ATTACH DATABASE ? AS incoming_backup").run(backupPath);
  try {
    const currentTables = db.prepare("SELECT name FROM main.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string }[];
    const backupTables = new Set((db.prepare("SELECT name FROM incoming_backup.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[]).map(({ name }) => name));

    db.pragma("defer_foreign_keys = ON");
    const restore = db.transaction(() => {
      for (const { name } of currentTables) db.prepare(`DELETE FROM main."${name.replaceAll('"', '""')}"`).run();
      for (const { name } of currentTables) {
        if (!backupTables.has(name)) continue;
        const quoted = name.replaceAll('"', '""');
        const columns = db.prepare(`PRAGMA main.table_info("${quoted}")`).all() as { name: string }[];
        const incomingColumns = new Set((db.prepare(`PRAGMA incoming_backup.table_info("${quoted}")`).all() as { name: string }[]).map(({ name: column }) => column));
        const sharedColumns = columns.map(({ name: column }) => column).filter((column) => incomingColumns.has(column));
        if (sharedColumns.length === 0) continue;
        const list = sharedColumns.map((column) => `"${column.replaceAll('"', '""')}"`).join(", ");
        db.prepare(`INSERT INTO main."${quoted}" (${list}) SELECT ${list} FROM incoming_backup."${quoted}"`).run();
      }
    });
    restore();
  } finally {
    db.exec("DETACH DATABASE incoming_backup");
  }
}

export async function POST(request: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BACKUP_BYTES) return NextResponse.json({ error: "The backup file is larger than the supported 1 GB upload size." }, { status: 413 });

  const tempDirectory = await mkdtemp(path.join(getAppDataDirectory(), ".terraland-restore-"));
  const backupDatabasePath = path.join(tempDirectory, "incoming.db");
  const stagedUploadsPath = path.join(tempDirectory, "uploads");
  const previousUploadsPath = path.join(tempDirectory, "previous-uploads");
  let uploadsMoved = false;
  let uploadsInstalled = false;
  try {
    const compressed = Buffer.from(await request.arrayBuffer());
    if (compressed.byteLength === 0 || compressed.byteLength > MAX_BACKUP_BYTES) {
      return NextResponse.json({ error: "Choose a valid Terraland backup file up to 1 GB." }, { status: 400 });
    }
    let manifest: BackupManifest;
    try {
      const json = gunzipSync(compressed, { maxOutputLength: MAX_BACKUP_BYTES }).toString("utf8");
      manifest = validateManifest(JSON.parse(json) as unknown);
    } catch (reason) {
      const message = reason instanceof Error && reason.message.includes("larger than")
        ? "The uncompressed backup exceeds the 1 GB safety limit."
        : reason instanceof Error && reason.message.startsWith("The backup")
          ? reason.message
          : "The file is damaged or is not a valid Terraland backup.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const database = Buffer.from(manifest.database.data, "base64");
    if (sha256(database) !== manifest.database.sha256) return NextResponse.json({ error: "The database file failed its integrity check." }, { status: 400 });
    await writeFile(backupDatabasePath, database, { flag: "wx" });
    const incomingDb = new Database(backupDatabasePath, { readonly: true, fileMustExist: true });
    try {
      const integrity = incomingDb.pragma("integrity_check") as { integrity_check: string }[];
      if (integrity.length !== 1 || integrity[0]?.integrity_check !== "ok") {
        return NextResponse.json({ error: "The backup database failed SQLite integrity validation." }, { status: 400 });
      }
      const tableCount = incomingDb.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").get() as { count: number };
      const requiredTables = new Set((incomingDb.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map(({ name }) => name));
      if (tableCount.count === 0 || !["users", "properties", "site_settings"].every((table) => requiredTables.has(table))) {
        return NextResponse.json({ error: "The backup database is missing required Terraland data tables." }, { status: 400 });
      }
      const requiredColumns: Record<string, string[]> = { users: ["id", "role"], properties: ["id", "image", "images", "videos"], site_settings: ["key", "value"] };
      for (const [table, required] of Object.entries(requiredColumns)) {
        const columns = new Set((incomingDb.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[]).map(({ name }) => name));
        if (!required.every((column) => columns.has(column))) {
          return NextResponse.json({ error: `The backup database is missing required ${table} fields.` }, { status: 400 });
        }
      }
      const adminCount = incomingDb.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get() as { count: number };
      if (adminCount.count === 0) return NextResponse.json({ error: "The backup does not contain an administrator account, so it cannot be restored safely." }, { status: 400 });
      const uploadNames = new Set(manifest.uploads.map(({ filename }) => filename));
      try {
        ensureReferencedMediaExists(getReferencedUploadNames(incomingDb), uploadNames);
      } catch (reason) {
        return NextResponse.json({ error: reason instanceof Error ? reason.message : "The backup is missing listing media files." }, { status: 400 });
      }
    } finally {
      incomingDb.close();
    }

    await mkdir(stagedUploadsPath, { recursive: true });
    for (const file of manifest.uploads) {
      const content = Buffer.from(file.data, "base64");
      if (sha256(content) !== file.sha256) return NextResponse.json({ error: `Media file ${file.filename} failed its integrity check.` }, { status: 400 });
      await writeFile(path.join(stagedUploadsPath, file.filename), content, { flag: "wx" });
    }

    const uploadDirectory = await ensurePropertyUploadDirectory();
    await mkdir(path.dirname(uploadDirectory), { recursive: true });
    await rename(uploadDirectory, previousUploadsPath);
    uploadsMoved = true;
    await rename(stagedUploadsPath, uploadDirectory);
    uploadsInstalled = true;
    try {
      restoreDatabase(backupDatabasePath);
    } catch (reason) {
      await rm(uploadDirectory, { recursive: true, force: true });
      uploadsInstalled = false;
      await rename(previousUploadsPath, uploadDirectory);
      uploadsMoved = false;
      uploadsInstalled = false;
      throw reason;
    }
    return NextResponse.json({ message: `Backup restored: database and ${manifest.uploads.length} listing media file(s).` });
  } catch (reason) {
    console.error("Admin backup restore failed", reason);
    return NextResponse.json({ error: "The backup could not be restored. Existing site data was kept." }, { status: 500 });
  } finally {
    if (uploadsMoved && !uploadsInstalled) {
      await rename(previousUploadsPath, getPropertyUploadDirectory()).catch(() => undefined);
    }
    await rm(tempDirectory, { recursive: true, force: true });
  }
}
