import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, mkdtemp, mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { createGzip, createGunzip } from "node:zlib";
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
const STREAM_BACKUP_VERSION = 2;
const STREAM_BACKUP_MAGIC = Buffer.from("NILAYBK2");
const MAX_BACKUP_BYTES = 1024 * 1024 * 1024;
const MAX_LEGACY_BACKUP_BYTES = 64 * 1024 * 1024;
const MAX_BACKUP_HEADER_BYTES = 16 * 1024 * 1024;
const MEDIA_FILENAME = /^(?!\.{1,2}$)[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp|mp4|webm)$/i;

type BackupFile = { filename: string; sha256: string; data: string };
type BackupManifest = {
  format: string;
  version: number;
  createdAt: string;
  database: { sha256: string; data: string };
  uploads: BackupFile[];
};
type StreamBackupHeader = {
  format: string;
  version: number;
  createdAt: string;
  database: { sha256: string; bytes: number };
  uploads: { filename: string; sha256: string; bytes: number }[];
};

function sha256(data: Buffer) {
  return createHash("sha256").update(data).digest("hex");
}

async function inspectFile(filePath: string) {
  const hash = createHash("sha256");
  let bytes = 0;
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
    bytes += chunk.length;
  }
  return { sha256: hash.digest("hex"), bytes };
}

async function* createStreamBackup(databasePath: string, uploads: { filename: string; path: string }[], header: StreamBackupHeader) {
  const encodedHeader = Buffer.from(JSON.stringify(header));
  const headerSize = Buffer.alloc(4);
  headerSize.writeUInt32BE(encodedHeader.byteLength);
  yield STREAM_BACKUP_MAGIC;
  yield headerSize;
  yield encodedHeader;
  for await (const chunk of createReadStream(databasePath)) yield chunk;
  for (const upload of uploads) {
    for await (const chunk of createReadStream(upload.path)) yield chunk;
  }
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
  let cleanupAfterStream = false;
  try {
    await db.backup(databaseCopyPath);
    const databaseInfo = await inspectFile(databaseCopyPath);
    const uploadDirectory = await ensurePropertyUploadDirectory();
    const uploads: { filename: string; path: string; sha256: string; bytes: number }[] = [];
    for (const entry of await readdir(uploadDirectory, { withFileTypes: true })) {
      if (!entry.isFile() || !MEDIA_FILENAME.test(entry.name)) continue;
      const uploadPath = path.join(uploadDirectory, entry.name);
      uploads.push({ filename: entry.name, path: uploadPath, ...await inspectFile(uploadPath) });
    }
    const snapshotDb = new Database(databaseCopyPath, { readonly: true, fileMustExist: true });
    try {
      ensureReferencedMediaExists(getReferencedUploadNames(snapshotDb), new Set(uploads.map(({ filename }) => filename)));
    } finally {
      snapshotDb.close();
    }

    const totalBytes = databaseInfo.bytes + uploads.reduce((total, upload) => total + upload.bytes, 0);
    if (totalBytes > MAX_BACKUP_BYTES) {
      return NextResponse.json({ error: "This backup is larger than the supported 1 GB size." }, { status: 413 });
    }
    const header: StreamBackupHeader = {
      format: BACKUP_FORMAT,
      version: STREAM_BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      database: { sha256: databaseInfo.sha256, bytes: databaseInfo.bytes },
      uploads: uploads.map(({ filename, sha256: digest, bytes }) => ({ filename, sha256: digest, bytes })),
    };
    if (Buffer.byteLength(JSON.stringify(header)) > MAX_BACKUP_HEADER_BYTES) {
      return NextResponse.json({ error: "This backup contains too many media files to package safely." }, { status: 413 });
    }
    const source = Readable.from(createStreamBackup(databaseCopyPath, uploads, header));
    const archive = createGzip({ level: 1 });
    source.on("error", (reason) => archive.destroy(reason instanceof Error ? reason : new Error("Backup stream failed.")));
    source.pipe(archive);
    archive.once("close", () => { void rm(tempDirectory, { recursive: true, force: true }); });
    cleanupAfterStream = true;
    return new NextResponse(Readable.toWeb(archive) as ReadableStream<Uint8Array>, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="terraland-backup-v2-${new Date().toISOString().slice(0, 10)}.terraland-backup.gz"`,
        "Cache-Control": "private, no-store, no-transform",
        "X-Backup-Format": "terraland-backup-v2",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "The backup could not be created.";
    return NextResponse.json({ error: message }, { status: message.startsWith("Backup is missing") || message.startsWith("A listing contains") ? 409 : 500 });
  } finally {
    if (!cleanupAfterStream) await rm(tempDirectory, { recursive: true, force: true });
  }
}

export async function HEAD() {
  if (!await isAdmin()) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
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

class StreamByteReader {
  private readonly iterator: AsyncIterator<Buffer | Uint8Array>;
  private chunks: Buffer[] = [];
  private available = 0;

  constructor(stream: Readable) {
    this.iterator = stream[Symbol.asyncIterator]();
  }

  async readExact(length: number) {
    while (this.available < length) {
      const next = await this.iterator.next();
      if (next.done) throw new Error("The backup ended before all data was received.");
      const chunk = Buffer.from(next.value);
      this.chunks.push(chunk);
      this.available += chunk.length;
    }
    const parts: Buffer[] = [];
    let remaining = length;
    while (remaining > 0) {
      const first = this.chunks[0];
      if (first.length <= remaining) {
        parts.push(this.chunks.shift()!);
        this.available -= first.length;
        remaining -= first.length;
      } else {
        parts.push(first.subarray(0, remaining));
        this.chunks[0] = first.subarray(remaining);
        this.available -= remaining;
        remaining = 0;
      }
    }
    return Buffer.concat(parts, length);
  }

  async copyExact(length: number, destination: string, expectedHash: string) {
    const output = await open(destination, "wx");
    const hash = createHash("sha256");
    let remaining = length;
    try {
      while (remaining > 0) {
        const chunk = await this.readExact(Math.min(64 * 1024, remaining));
        hash.update(chunk);
        let offset = 0;
        while (offset < chunk.length) {
          const result = await output.write(chunk, offset, chunk.length - offset);
          offset += result.bytesWritten;
        }
        remaining -= chunk.length;
      }
    } finally {
      await output.close();
    }
    if (hash.digest("hex") !== expectedHash) throw new Error("A backup file failed its integrity check.");
  }

  async readRemainder(maxBytes: number) {
    const chunks = [...this.chunks];
    let total = this.available;
    while (true) {
      const next = await this.iterator.next();
      if (next.done) break;
      const chunk = Buffer.from(next.value);
      total += chunk.length;
      if (total > maxBytes) throw new Error("This older backup is too large for safe restore. Download a fresh backup using the updated site.");
      chunks.push(chunk);
    }
    if (total > maxBytes) throw new Error("This older backup is too large for safe restore. Download a fresh backup using the updated site.");
    return Buffer.concat(chunks, total);
  }

  async ensureEnd() {
    if (this.available > 0) throw new Error("The backup contains unexpected extra data.");
    const next = await this.iterator.next();
    if (!next.done) throw new Error("The backup contains unexpected extra data.");
  }
}

function validateStreamHeader(value: unknown): StreamBackupHeader {
  if (!value || typeof value !== "object") throw new Error("The streaming backup header is invalid.");
  const header = value as Partial<StreamBackupHeader>;
  if (header.format !== BACKUP_FORMAT || header.version !== STREAM_BACKUP_VERSION ||
    typeof header.createdAt !== "string" || !Number.isFinite(Date.parse(header.createdAt)) ||
    !header.database || typeof header.database !== "object" || !/^[a-f0-9]{64}$/.test(header.database.sha256) ||
    !Number.isSafeInteger(header.database.bytes) || header.database.bytes < 1 || !Array.isArray(header.uploads) ||
    header.uploads.length > 100_000) {
    throw new Error("The streaming backup header is invalid or unsupported.");
  }
  let totalBytes = header.database.bytes;
  const filenames = new Set<string>();
  for (const file of header.uploads) {
    if (!file || typeof file !== "object" || !MEDIA_FILENAME.test(file.filename) ||
      !/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes < 0 ||
      filenames.has(file.filename)) {
      throw new Error("The backup contains an invalid or duplicate media file entry.");
    }
    filenames.add(file.filename);
    totalBytes += file.bytes;
  }
  if (totalBytes > MAX_BACKUP_BYTES) throw new Error("The uncompressed backup exceeds the 1 GB safety limit.");
  return header as StreamBackupHeader;
}

async function stageBackupPayload(reader: StreamByteReader, databasePath: string, uploadsPath: string) {
  const prefix = await reader.readExact(STREAM_BACKUP_MAGIC.length);
  if (prefix.equals(STREAM_BACKUP_MAGIC)) {
    const headerLength = (await reader.readExact(4)).readUInt32BE(0);
    if (headerLength < 2 || headerLength > MAX_BACKUP_HEADER_BYTES) throw new Error("The backup header size is invalid.");
    const header = validateStreamHeader(JSON.parse((await reader.readExact(headerLength)).toString("utf8")) as unknown);
    await reader.copyExact(header.database.bytes, databasePath, header.database.sha256);
    await mkdir(uploadsPath, { recursive: true });
    for (const file of header.uploads) {
      await reader.copyExact(file.bytes, path.join(uploadsPath, file.filename), file.sha256);
    }
    await reader.ensureEnd();
    return { uploadNames: new Set(header.uploads.map(({ filename }) => filename)), uploadCount: header.uploads.length };
  }

  const legacyData = Buffer.concat([prefix, await reader.readRemainder(MAX_LEGACY_BACKUP_BYTES)]);
  let manifest: BackupManifest;
  try { manifest = validateManifest(JSON.parse(legacyData.toString("utf8").replace(/^\uFEFF/, "")) as unknown); }
  catch (reason) {
    if (reason instanceof Error && reason.message.startsWith("This older backup")) throw reason;
    throw new Error("This file is not a readable Terraland backup. Download a fresh backup from the updated site.");
  }
  const database = Buffer.from(manifest.database.data, "base64");
  if (sha256(database) !== manifest.database.sha256) throw new Error("The database file failed its integrity check.");
  await writeFile(databasePath, database, { flag: "wx" });
  await mkdir(uploadsPath, { recursive: true });
  for (const file of manifest.uploads) {
    const content = Buffer.from(file.data, "base64");
    if (sha256(content) !== file.sha256) throw new Error(`Media file ${file.filename} failed its integrity check.`);
    await writeFile(path.join(uploadsPath, file.filename), content, { flag: "wx" });
  }
  return { uploadNames: new Set(manifest.uploads.map(({ filename }) => filename)), uploadCount: manifest.uploads.length };
}

async function createBackupReader(request: NextRequest) {
  if (!request.body) throw new Error("Choose a backup file to restore.");
  const source = Readable.fromWeb(request.body as never);
  const iterator = source[Symbol.asyncIterator]();
  const prefixChunks: Buffer[] = [];
  let prefixLength = 0;
  let total = 0;
  while (prefixLength < 2) {
    const first = await iterator.next();
    if (first.done) break;
    const chunk = Buffer.from(first.value);
    total += chunk.length;
    prefixChunks.push(chunk);
    prefixLength += chunk.length;
  }
  if (prefixLength === 0) throw new Error("Choose a backup file to restore.");
  const firstChunk = Buffer.concat(prefixChunks, prefixLength);
  async function* limitedChunks() {
    yield firstChunk;
    while (true) {
      const next = await iterator.next();
      if (next.done) break;
      const chunk = Buffer.from(next.value);
      total += chunk.length;
      if (total > MAX_BACKUP_BYTES) throw new Error("The backup file is larger than the supported 1 GB upload size.");
      yield chunk;
    }
  }
  if (total > MAX_BACKUP_BYTES) throw new Error("The backup file is larger than the supported 1 GB upload size.");
  const replay = Readable.from(limitedChunks());
  const isGzip = firstChunk[0] === 0x1f && firstChunk[1] === 0x8b;
  const decoded = isGzip ? replay.pipe(createGunzip()) : replay;
  return new StreamByteReader(decoded);
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
    let staged: { uploadNames: Set<string>; uploadCount: number };
    try {
      const reader = await createBackupReader(request);
      staged = await stageBackupPayload(reader, backupDatabasePath, stagedUploadsPath);
    } catch (reason) {
      const message = reason instanceof Error && (reason.message.includes("1 GB") || reason.message.startsWith("This older backup"))
        ? reason.message
        : "This file is not a readable Terraland backup. Download a fresh backup from the updated site; no site data was changed.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const incomingDb = new Database(backupDatabasePath, { readonly: true, fileMustExist: true });
    try {
      const integrity = incomingDb.pragma("integrity_check") as { integrity_check: string }[];
      if (integrity.length !== 1 || integrity[0]?.integrity_check !== "ok") {
        return NextResponse.json({ error: "The backup database failed SQLite integrity validation." }, { status: 400 });
      }
      const tableCount = incomingDb.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").get() as { count: number };
      const requiredTables = new Set((incomingDb.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map(({ name }) => name));
      if (tableCount.count === 0 || !["users", "properties", "site_settings", "property_reviews"].every((table) => requiredTables.has(table))) {
        return NextResponse.json({ error: "The backup database is missing required Terraland data tables, including listing reviews. No data was restored." }, { status: 400 });
      }
      const requiredColumns: Record<string, string[]> = { users: ["id", "role"], properties: ["id", "image", "images", "videos"], site_settings: ["key", "value"], property_reviews: ["id", "propertyId", "userId", "reviewerName", "rating", "comment", "createdAt"] };
      for (const [table, required] of Object.entries(requiredColumns)) {
        const columns = new Set((incomingDb.prepare(`PRAGMA table_info("${table}")`).all() as { name: string }[]).map(({ name }) => name));
        if (!required.every((column) => columns.has(column))) {
          return NextResponse.json({ error: `The backup database is missing required ${table} fields.` }, { status: 400 });
        }
      }
      const adminCount = incomingDb.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get() as { count: number };
      if (adminCount.count === 0) return NextResponse.json({ error: "The backup does not contain an administrator account, so it cannot be restored safely." }, { status: 400 });
      try {
        ensureReferencedMediaExists(getReferencedUploadNames(incomingDb), staged.uploadNames);
      } catch (reason) {
        return NextResponse.json({ error: reason instanceof Error ? reason.message : "The backup is missing listing media files." }, { status: 400 });
      }
    } finally {
      incomingDb.close();
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
    const restoredReviews = db.prepare("SELECT COUNT(*) AS count FROM property_reviews").get() as { count: number };
    return NextResponse.json({ message: `Backup restored: database, ${staged.uploadCount} listing media file(s), and ${restoredReviews.count} review(s).` });
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
