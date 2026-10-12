import path from "node:path";

export function getAppDataDirectory() {
  if (process.env.NEXT_PHASE === "phase-production-build") return path.join(process.cwd(), "data");
  return process.env.APP_DATA_DIR?.trim() ||
    (process.env.RENDER === "true" ? "/var/data" : path.join(process.cwd(), "data"));
}

export function getDatabaseFilePath() {
  if (process.env.NEXT_PHASE === "phase-production-build") return path.join(process.cwd(), "data", "landmark.db");
  return process.env.DATABASE_PATH?.trim() || path.join(getAppDataDirectory(), "landmark.db");
}

export function getPropertyUploadDirectory() {
  return path.join(getAppDataDirectory(), "uploads");
}
