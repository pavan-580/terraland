import "server-only";
import Database from "better-sqlite3";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { seedProperties, type Property } from "@/lib/market";
import { getDatabaseFilePath } from "@/lib/storage-path";

const globalForDb = globalThis as typeof globalThis & { landDb?: Database.Database };

function addColumnIfMissing(db: Database.Database, table: string, columnName: string, statement: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (columns.some((column) => column.name === columnName)) return;
  try {
    db.exec(statement);
  } catch (error) {
    const refreshedColumns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!(error instanceof Error) || !/duplicate column name/i.test(error.message) ||
      !refreshedColumns.some((column) => column.name === columnName)) {
      throw error;
    }
  }
}

function createDatabase() {
  const filePath = getDatabaseFilePath();
  mkdirSync(path.dirname(filePath), { recursive: true });
  const previousDatabasePath = path.join(process.cwd(), "data", "landmark.db");
  if (process.env.RENDER === "true" && filePath !== previousDatabasePath && !existsSync(filePath) && existsSync(previousDatabasePath)) {
    copyFileSync(previousDatabasePath, filePath);
    if (existsSync(`${previousDatabasePath}-wal`)) copyFileSync(`${previousDatabasePath}-wal`, `${filePath}-wal`);
  }
  const db = new Database(filePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      phone TEXT NOT NULL DEFAULT '',
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expiresAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS password_reset_codes (
      email TEXT PRIMARY KEY COLLATE NOCASE,
      codeHash TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      requestedAt TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      listingCategory TEXT NOT NULL DEFAULT 'sale',
      pricePeriod TEXT NOT NULL DEFAULT 'total',
      availability TEXT NOT NULL DEFAULT '',
      guestCapacity INTEGER,
      city TEXT NOT NULL,
      locality TEXT NOT NULL,
      price INTEGER NOT NULL,
      area REAL NOT NULL,
      unit TEXT NOT NULL,
      image TEXT NOT NULL,
      images TEXT NOT NULL DEFAULT '[]',
      videos TEXT NOT NULL DEFAULT '[]',
      ownerId TEXT REFERENCES users(id) ON DELETE SET NULL,
      badge TEXT NOT NULL,
      description TEXT NOT NULL,
      owner TEXT NOT NULL,
      phone TEXT NOT NULL,
      showPhone INTEGER NOT NULL DEFAULT 1,
      facing TEXT NOT NULL DEFAULT '',
      approvals TEXT NOT NULL DEFAULT '',
      loanAvailable TEXT NOT NULL DEFAULT '',
      registrationAvailable TEXT NOT NULL DEFAULT '',
      renovation TEXT NOT NULL DEFAULT '',
      cornerPlot TEXT NOT NULL DEFAULT '',
      roadWidth TEXT NOT NULL DEFAULT '',
      surveyNumber TEXT NOT NULL DEFAULT '',
      soilType TEXT NOT NULL DEFAULT '',
      clearTitle TEXT NOT NULL DEFAULT '',
      amenities TEXT NOT NULL DEFAULT '[]',
      address TEXT NOT NULL DEFAULT '',
      landmark TEXT NOT NULL DEFAULT '',
      mapUrl TEXT NOT NULL DEFAULT '',
      verified INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'published',
      deleteRequestedAt TEXT,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS favorites (
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      propertyId TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (userId, propertyId)
    );
    CREATE TABLE IF NOT EXISTS inquiries (
      id TEXT PRIMARY KEY,
      propertyId TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      userId TEXT REFERENCES users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL,
      message TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS property_reviews (
      id TEXT PRIMARY KEY,
      propertyId TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      userId TEXT REFERENCES users(id) ON DELETE SET NULL,
      reviewerName TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT,
      UNIQUE(propertyId, userId)
    );
    CREATE TABLE IF NOT EXISTS registration_notifications (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      lastError TEXT,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sentAt TEXT
    );
    CREATE TABLE IF NOT EXISTS inquiry_notifications (
      id TEXT PRIMARY KEY,
      inquiryId TEXT NOT NULL UNIQUE REFERENCES inquiries(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      lastError TEXT,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sentAt TEXT
    );
    CREATE INDEX IF NOT EXISTS properties_city_idx ON properties(city);
    CREATE INDEX IF NOT EXISTS properties_type_idx ON properties(type);
  `);
  addColumnIfMissing(db, "users", "role", "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
  addColumnIfMissing(db, "users", "phone", "ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, "properties", "images", "ALTER TABLE properties ADD COLUMN images TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing(db, "properties", "videos", "ALTER TABLE properties ADD COLUMN videos TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing(db, "properties", "deleteRequestedAt", "ALTER TABLE properties ADD COLUMN deleteRequestedAt TEXT");
  db.prepare("INSERT OR IGNORE INTO site_settings (key, value) VALUES ('showSellerPhones', 'true')").run();
  addColumnIfMissing(db, "properties", "listingCategory", "ALTER TABLE properties ADD COLUMN listingCategory TEXT NOT NULL DEFAULT 'sale'");
  addColumnIfMissing(db, "properties", "pricePeriod", "ALTER TABLE properties ADD COLUMN pricePeriod TEXT NOT NULL DEFAULT 'total'");
  addColumnIfMissing(db, "properties", "availability", "ALTER TABLE properties ADD COLUMN availability TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, "properties", "guestCapacity", "ALTER TABLE properties ADD COLUMN guestCapacity INTEGER");
  db.prepare("UPDATE properties SET listingCategory = 'rent', pricePeriod = CASE WHEN pricePeriod = 'total' THEN 'per-night' ELSE pricePeriod END WHERE listingCategory = 'stay'").run();
  addColumnIfMissing(db, "properties", "ownerId", "ALTER TABLE properties ADD COLUMN ownerId TEXT REFERENCES users(id) ON DELETE SET NULL");
  addColumnIfMissing(db, "properties", "showPhone", "ALTER TABLE properties ADD COLUMN showPhone INTEGER NOT NULL DEFAULT 1");
  addColumnIfMissing(db, "properties", "facing", "ALTER TABLE properties ADD COLUMN facing TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, "properties", "approvals", "ALTER TABLE properties ADD COLUMN approvals TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, "properties", "loanAvailable", "ALTER TABLE properties ADD COLUMN loanAvailable TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, "properties", "registrationAvailable", "ALTER TABLE properties ADD COLUMN registrationAvailable TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, "properties", "renovation", "ALTER TABLE properties ADD COLUMN renovation TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, "properties", "cornerPlot", "ALTER TABLE properties ADD COLUMN cornerPlot TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, "properties", "roadWidth", "ALTER TABLE properties ADD COLUMN roadWidth TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, "properties", "surveyNumber", "ALTER TABLE properties ADD COLUMN surveyNumber TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, "properties", "soilType", "ALTER TABLE properties ADD COLUMN soilType TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, "properties", "clearTitle", "ALTER TABLE properties ADD COLUMN clearTitle TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, "properties", "amenities", "ALTER TABLE properties ADD COLUMN amenities TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing(db, "properties", "address", "ALTER TABLE properties ADD COLUMN address TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, "properties", "landmark", "ALTER TABLE properties ADD COLUMN landmark TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, "properties", "mapUrl", "ALTER TABLE properties ADD COLUMN mapUrl TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, "inquiries", "userId", "ALTER TABLE inquiries ADD COLUMN userId TEXT REFERENCES users(id) ON DELETE SET NULL");
  addColumnIfMissing(db, "inquiries", "email", "ALTER TABLE inquiries ADD COLUMN email TEXT NOT NULL DEFAULT ''");
  db.exec(`
    UPDATE properties SET ownerId = (
      SELECT MIN(users.id) FROM users
      WHERE users.name = properties.owner COLLATE NOCASE AND users.role != 'admin'
      HAVING COUNT(*) = 1
    )
    WHERE ownerId IS NULL AND EXISTS (
      SELECT 1 FROM users
      WHERE users.name = properties.owner COLLATE NOCASE AND users.role != 'admin'
      GROUP BY users.name HAVING COUNT(*) = 1
    )
  `);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO properties
      (id, title, type, city, locality, price, area, unit, image, images, badge, description, owner, phone, verified)
    VALUES
      (@id, @title, @type, @city, @locality, @price, @area, @unit, @image, @images, @badge, @description, @owner, @phone, @verified)
  `);
  const insertSeeds = db.transaction((properties: Property[]) => {
    for (const property of properties) insert.run({
      ...property,
      images: JSON.stringify(property.images ?? [property.image]),
      verified: Number(property.verified),
    });
  });
  insertSeeds(seedProperties);
  return db;
}


export const db = globalForDb.landDb ?? createDatabase();
globalForDb.landDb = db;

db.exec(`
  CREATE TABLE IF NOT EXISTS visitor_daily_counts (
    visitorId TEXT NOT NULL,
    visitDate TEXT NOT NULL,
    pageViews INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (visitorId, visitDate)
  );
  CREATE INDEX IF NOT EXISTS visitor_daily_counts_date_idx ON visitor_daily_counts(visitDate);
`);

db.exec(
  "CREATE TABLE IF NOT EXISTS lender_interests (" +
  "id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, " +
  "amount INTEGER NOT NULL, message TEXT NOT NULL DEFAULT '', consentedAt TEXT NOT NULL, " +
  "notificationStatus TEXT NOT NULL DEFAULT 'pending', notificationError TEXT, " +
  "createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"
);

export function getSiteSetting(key: string): string | null {
  const setting = db.prepare("SELECT value FROM site_settings WHERE key = ?").get(key) as { value: string } | undefined;
  return setting?.value ?? null;
}

export function setSiteSetting(key: string, value: string) {
  db.prepare("INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS registration_notifications (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    lastError TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sentAt TEXT
  )
`);

export function propertyFromRow(row: Record<string, unknown>): Property {
  let images: string[] = [];
  let videos: string[] = [];
  let amenities: string[] = [];
  if (typeof row.images === "string") {
    try {
      const parsed: unknown = JSON.parse(row.images);
      if (Array.isArray(parsed)) images = parsed.filter((image): image is string => typeof image === "string");
    } catch {
      images = [];
    }
  }
  if (typeof row.videos === "string") {
    try {
      const parsed: unknown = JSON.parse(row.videos);
      if (Array.isArray(parsed)) videos = parsed.filter((video): video is string => typeof video === "string");
    } catch {
      videos = [];
    }
  }
  if (typeof row.amenities === "string") {
    try {
      const parsed: unknown = JSON.parse(row.amenities);
      if (Array.isArray(parsed)) amenities = parsed.filter((item): item is string => typeof item === "string");
    } catch {
      amenities = [];
    }
  }
  const image = typeof row.image === "string" ? row.image : "";
  return {
    ...row,
    image,
    images: images.length ? images : image ? [image] : [],
    videos,
    amenities,
    verified: Boolean(row.verified),
    ...(row.showPhone !== undefined ? { showPhone: Boolean(row.showPhone) } : {}),
  } as Property;
}

export function publicPropertyFromRow(row: Record<string, unknown>, showSellerContacts: boolean): Property {
  const property = propertyFromRow(row) as Property & { ownerId?: string; sellerEmail?: string };
  const { sellerEmail, showPhone, ...publicProperty } = property;
  delete publicProperty.ownerId;
  const safeEmail = typeof sellerEmail === "string" && !sellerEmail.endsWith("@phone.nilay.invalid") ? sellerEmail : "";
  return {
    ...publicProperty,
    phone: showSellerContacts && showPhone !== false ? publicProperty.phone : "",
    ...(showSellerContacts && safeEmail ? { sellerEmail: safeEmail } : {}),
  };
}
