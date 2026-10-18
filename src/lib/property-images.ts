import "server-only";
import { access, copyFile, mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { newId } from "@/lib/session";
import { getPropertyUploadDirectory } from "@/lib/storage-path";

let uploadDirectoryReady: Promise<string> | undefined;

export async function ensurePropertyUploadDirectory() {
  if (!uploadDirectoryReady) uploadDirectoryReady = (async () => {
    const uploadDirectory = getPropertyUploadDirectory();
    await mkdir(uploadDirectory, { recursive: true });
    const previousDirectory = path.join(process.cwd(), "public", "uploads");
    if (previousDirectory !== uploadDirectory) {
      try {
        for (const filename of await readdir(previousDirectory)) {
          if (/^[a-zA-Z0-9._-]+$/.test(filename)) await copyFile(path.join(previousDirectory, filename), path.join(uploadDirectory, filename)).catch(() => undefined);
        }
      } catch { /* No earlier local upload directory to migrate. */ }
    }
    return uploadDirectory;
  })();
  return uploadDirectoryReady;
}

export async function storePropertyPhotos(files: File[]) {
  const validatedFiles: { file: File; extension: string }[] = [];
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) throw new Error("Each photo must be 5 MB or smaller.");
    const data = Buffer.from(await file.arrayBuffer());
    let extension: string | null = null;
    if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) extension = "jpg";
    if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) extension = "png";
    if (data.length >= 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") extension = "webp";
    if (!extension) throw new Error("Photos must be valid JPEG, PNG, or WebP images.");
    validatedFiles.push({ file, extension });
  }

  const uploadDirectory = await ensurePropertyUploadDirectory();
  const images: string[] = [];
  for (const photo of validatedFiles) {
    const filename = `${newId()}.${photo.extension}`;
    await writeFile(path.join(/*turbopackIgnore: true*/ uploadDirectory, filename), Buffer.from(await photo.file.arrayBuffer()), { flag: "wx" });
    images.push(`/uploads/${filename}`);
  }
  return images;
}

export async function storePropertyVideos(files: File[]) {
  const validatedFiles: { file: File; extension: string }[] = [];
  for (const file of files) {
    if (file.size > 100 * 1024 * 1024) throw new Error("Each video must be 100 MB or smaller.");
    const data = Buffer.from(await file.arrayBuffer());
    let extension: string | null = null;
    if (data.length >= 12 && data.toString("ascii", 4, 8) === "ftyp") extension = "mp4";
    if (data.length >= 4 && data[0] === 0x1a && data[1] === 0x45 && data[2] === 0xdf && data[3] === 0xa3) extension = "webm";
    if (!extension) throw new Error("Videos must be valid MP4 or WebM files.");
    validatedFiles.push({ file, extension });
  }

  const uploadDirectory = await ensurePropertyUploadDirectory();
  const videos: string[] = [];
  for (const video of validatedFiles) {
    const filename = `${newId()}.${video.extension}`;
    await writeFile(path.join(/*turbopackIgnore: true*/ uploadDirectory, filename), Buffer.from(await video.file.arrayBuffer()), { flag: "wx" });
    videos.push(`/uploads/${filename}`);
  }
  return videos;
}

export async function deleteStoredPropertyFiles(sources: string[]) {
  const storedPaths = [...new Set(sources)].filter((source) => /^\/uploads\/[a-zA-Z0-9._-]+$/.test(source));
  if (!storedPaths.length) return;
  const uploadDirectory = await ensurePropertyUploadDirectory();
  for (const source of storedPaths) {
    await unlink(path.join(uploadDirectory, path.basename(source))).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

export async function validateStoredPropertyPhotos(value: unknown): Promise<string[] | null> {
  if (!Array.isArray(value) || value.length === 0) return null;
  const uploadDirectory = await ensurePropertyUploadDirectory();
  const images: string[] = [];
  for (const image of value) {
    if (typeof image !== "string" || !/^\/uploads\/[a-zA-Z0-9._-]+$/.test(image)) return null;
    try {
      await access(path.join(uploadDirectory, path.basename(image)));
    } catch {
      return null;
    }
    images.push(image);
  }
  return images;
}

export async function validateStoredPropertyVideos(value: unknown): Promise<string[] | null> {
  if (!Array.isArray(value)) return null;
  const uploadDirectory = await ensurePropertyUploadDirectory();
  const videos: string[] = [];
  for (const video of value) {
    if (typeof video !== "string" || !/^\/uploads\/[a-zA-Z0-9._-]+\.(mp4|webm)$/.test(video)) return null;
    try {
      await access(path.join(uploadDirectory, path.basename(video)));
    } catch {
      return null;
    }
    videos.push(video);
  }
  return videos;
}
