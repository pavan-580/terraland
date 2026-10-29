import "server-only";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { calculatePricePerSqYd, seedProperties, type Property } from "@/lib/market";
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
  db.pragma("busy_timeout = 10000");
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
    CREATE TABLE IF NOT EXISTS seller_phone_clicks (
      id TEXT PRIMARY KEY,
      propertyId TEXT NOT NULL,
      propertyTitle TEXT NOT NULL,
      sellerName TEXT NOT NULL,
      userId TEXT NOT NULL DEFAULT '',
      userName TEXT NOT NULL DEFAULT '',
      userPhone TEXT NOT NULL DEFAULT '',
      visitorId TEXT NOT NULL DEFAULT '',
      contactMethod TEXT NOT NULL DEFAULT 'phone',
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS member_activity_log (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      propertyId TEXT,
      propertyTitle TEXT,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS site_activity_log (
      id TEXT PRIMARY KEY,
      userId TEXT,
      actorName TEXT NOT NULL DEFAULT '',
      visitorId TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      propertyId TEXT,
      propertyTitle TEXT,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    CREATE TABLE IF NOT EXISTS customer_listing_interests (
      id TEXT PRIMARY KEY,
      userId TEXT,
      customerName TEXT NOT NULL,
      customerEmail TEXT NOT NULL COLLATE NOCASE,
      customerPhone TEXT NOT NULL DEFAULT '',
      propertyId TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      source TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      lastEmailedAt TEXT,
      emailCount INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(customerEmail, propertyId)
    );
    CREATE INDEX IF NOT EXISTS properties_city_idx ON properties(city);
    CREATE INDEX IF NOT EXISTS properties_type_idx ON properties(type);
    CREATE INDEX IF NOT EXISTS seller_phone_clicks_created_idx ON seller_phone_clicks(createdAt);
    CREATE INDEX IF NOT EXISTS member_activity_user_created_idx ON member_activity_log(userId, createdAt);
    CREATE INDEX IF NOT EXISTS site_activity_created_idx ON site_activity_log(createdAt);
  `);
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    appliedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  addColumnIfMissing(db, "users", "role", "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
  addColumnIfMissing(db, "users", "phone", "ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, "seller_phone_clicks", "contactMethod", "ALTER TABLE seller_phone_clicks ADD COLUMN contactMethod TEXT NOT NULL DEFAULT 'phone'");
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
  const listingReviewMigration = db.prepare("SELECT 1 FROM schema_migrations WHERE version = 1").get();
  if (!listingReviewMigration) {
    db.transaction(() => {
      addColumnIfMissing(db, "properties", "sellerAuthority", "ALTER TABLE properties ADD COLUMN sellerAuthority TEXT NOT NULL DEFAULT ''");
      addColumnIfMissing(db, "properties", "publicationConsentAt", "ALTER TABLE properties ADD COLUMN publicationConsentAt TEXT");
      addColumnIfMissing(db, "properties", "contactConsentAt", "ALTER TABLE properties ADD COLUMN contactConsentAt TEXT");
      db.prepare("INSERT INTO schema_migrations (version, name) VALUES (?, ?)").run(1, "seller-publication-review-consent");
    })();
  }
  const crmMigration = db.prepare("SELECT 1 FROM schema_migrations WHERE version = 2").get();
  if (!crmMigration) {
    db.transaction(() => {
      addColumnIfMissing(db, "properties", "updatedAt", "ALTER TABLE properties ADD COLUMN updatedAt TEXT NOT NULL DEFAULT ''");
      db.prepare("UPDATE properties SET updatedAt = createdAt WHERE updatedAt = '' OR updatedAt IS NULL").run();
      addColumnIfMissing(db, "properties", "isNegotiable", "ALTER TABLE properties ADD COLUMN isNegotiable TEXT NOT NULL DEFAULT ''");
      addColumnIfMissing(db, "properties", "documentStatus", "ALTER TABLE properties ADD COLUMN documentStatus TEXT NOT NULL DEFAULT ''");
      addColumnIfMissing(db, "properties", "legalDisclaimerAgreed", "ALTER TABLE properties ADD COLUMN legalDisclaimerAgreed INTEGER NOT NULL DEFAULT 1");
      addColumnIfMissing(db, "inquiries", "contactMethod", "ALTER TABLE inquiries ADD COLUMN contactMethod TEXT NOT NULL DEFAULT 'phone'");
      addColumnIfMissing(db, "inquiries", "preferredTimeline", "ALTER TABLE inquiries ADD COLUMN preferredTimeline TEXT NOT NULL DEFAULT ''");
      addColumnIfMissing(db, "inquiries", "fundingReadiness", "ALTER TABLE inquiries ADD COLUMN fundingReadiness TEXT NOT NULL DEFAULT ''");
      addColumnIfMissing(db, "inquiries", "contactConsent", "ALTER TABLE inquiries ADD COLUMN contactConsent INTEGER NOT NULL DEFAULT 1");
      addColumnIfMissing(db, "inquiries", "source", "ALTER TABLE inquiries ADD COLUMN source TEXT NOT NULL DEFAULT 'website'");
      addColumnIfMissing(db, "inquiries", "status", "ALTER TABLE inquiries ADD COLUMN status TEXT NOT NULL DEFAULT 'new'");
      addColumnIfMissing(db, "inquiries", "notes", "ALTER TABLE inquiries ADD COLUMN notes TEXT NOT NULL DEFAULT ''");
      addColumnIfMissing(db, "inquiries", "lastContactDate", "ALTER TABLE inquiries ADD COLUMN lastContactDate TEXT");
      addColumnIfMissing(db, "inquiries", "nextFollowUpDate", "ALTER TABLE inquiries ADD COLUMN nextFollowUpDate TEXT");

      db.exec(`
        CREATE TABLE IF NOT EXISTS buyer_requirements (
          id TEXT PRIMARY KEY,
          userId TEXT REFERENCES users(id) ON DELETE SET NULL,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT NOT NULL DEFAULT '',
          preferredLocation TEXT NOT NULL,
          minBudget INTEGER NOT NULL DEFAULT 0,
          maxBudget INTEGER NOT NULL DEFAULT 0,
          minPlotSize REAL NOT NULL DEFAULT 0,
          maxPlotSize REAL NOT NULL DEFAULT 0,
          intendedUse TEXT NOT NULL DEFAULT '',
          timeline TEXT NOT NULL DEFAULT '',
          fundingReadiness TEXT NOT NULL DEFAULT '',
          preferredContactMethod TEXT NOT NULL DEFAULT 'phone',
          contactConsent INTEGER NOT NULL DEFAULT 1,
          source TEXT NOT NULL DEFAULT 'website',
          status TEXT NOT NULL DEFAULT 'new',
          assignedTo TEXT NOT NULL DEFAULT 'Founder',
          notes TEXT NOT NULL DEFAULT '',
          lastContactDate TEXT,
          nextFollowUpDate TEXT,
          createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS buyer_req_status_idx ON buyer_requirements(status);
        CREATE INDEX IF NOT EXISTS buyer_req_created_idx ON buyer_requirements(createdAt);

        CREATE TABLE IF NOT EXISTS leads (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL DEFAULT 'buyer',
          referenceId TEXT,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'new',
          source TEXT NOT NULL DEFAULT 'website',
          assignedPerson TEXT NOT NULL DEFAULT 'Founder',
          lastContactDate TEXT,
          nextFollowUpDate TEXT,
          notes TEXT NOT NULL DEFAULT '',
          statusHistory TEXT NOT NULL DEFAULT '[]',
          relatedPropertyIds TEXT NOT NULL DEFAULT '[]',
          consentStatus TEXT NOT NULL DEFAULT 'consented',
          optedOut INTEGER NOT NULL DEFAULT 0,
          createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
        CREATE INDEX IF NOT EXISTS leads_created_idx ON leads(createdAt);

        CREATE TABLE IF NOT EXISTS site_visits (
          id TEXT PRIMARY KEY,
          leadId TEXT REFERENCES leads(id) ON DELETE SET NULL,
          buyerId TEXT,
          buyerName TEXT NOT NULL,
          buyerPhone TEXT NOT NULL,
          propertyId TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
          sellerId TEXT,
          sellerName TEXT NOT NULL DEFAULT '',
          sellerPhone TEXT NOT NULL DEFAULT '',
          proposedDate TEXT NOT NULL,
          proposedTime TEXT NOT NULL DEFAULT '',
          confirmationStatus TEXT NOT NULL DEFAULT 'proposed',
          visitOutcome TEXT NOT NULL DEFAULT '',
          buyerFeedback TEXT NOT NULL DEFAULT '',
          nextAction TEXT NOT NULL DEFAULT '',
          nextActionDueDate TEXT,
          createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS site_visits_prop_idx ON site_visits(propertyId);
        CREATE INDEX IF NOT EXISTS site_visits_status_idx ON site_visits(confirmationStatus);

        CREATE TABLE IF NOT EXISTS service_packages (
          id TEXT PRIMARY KEY,
          clientName TEXT NOT NULL,
          clientPhone TEXT NOT NULL,
          clientEmail TEXT NOT NULL DEFAULT '',
          clientRole TEXT NOT NULL DEFAULT 'seller',
          propertyId TEXT REFERENCES properties(id) ON DELETE SET NULL,
          packageType TEXT NOT NULL DEFAULT 'free_listing',
          agreedPrice INTEGER NOT NULL DEFAULT 0,
          durationDays INTEGER NOT NULL DEFAULT 30,
          invoiceStatus TEXT NOT NULL DEFAULT 'draft',
          paymentStatus TEXT NOT NULL DEFAULT 'unpaid',
          paymentConfirmedAt TEXT,
          deliverables TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          userId TEXT,
          userEmail TEXT NOT NULL,
          action TEXT NOT NULL,
          resource TEXT NOT NULL,
          resourceId TEXT NOT NULL,
          details TEXT NOT NULL DEFAULT '',
          ipAddress TEXT NOT NULL DEFAULT '',
          createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(createdAt);

        CREATE TABLE IF NOT EXISTS property_matches (
          id TEXT PRIMARY KEY,
          buyerRequirementId TEXT NOT NULL REFERENCES buyer_requirements(id) ON DELETE CASCADE,
          propertyId TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
          score INTEGER NOT NULL DEFAULT 0,
          explanation TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending_review',
          reviewedAt TEXT,
          reviewedBy TEXT,
          createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS prop_matches_req_idx ON property_matches(buyerRequirementId);
      `);
      db.prepare("INSERT INTO schema_migrations (version, name) VALUES (?, ?)").run(2, "terraland-crm-leads-matching-visits");
    })();
  }
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
  if (process.env.SEED_DEMO_DATA === "true") {
    insertSeeds(seedProperties);
  }
  return db;
}


export const db = globalForDb.landDb ?? createDatabase();
globalForDb.landDb = db;

export function logMemberActivity(
  userId: string,
  action: string,
  details = "",
  property?: { id: string; title: string } | null,
) {
  const id = randomUUID();
  const actor = db.prepare("SELECT name FROM users WHERE id = ?").get(userId) as { name: string } | undefined;
  db.prepare(`
    INSERT INTO member_activity_log (id, userId, action, details, propertyId, propertyTitle)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, action.slice(0, 100), details.slice(0, 1000), property?.id ?? null, property?.title ?? null);
  db.prepare(`
    INSERT INTO site_activity_log (id, userId, actorName, action, details, propertyId, propertyTitle)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, actor?.name ?? "Member", action.slice(0, 100), details.slice(0, 1000), property?.id ?? null, property?.title ?? null);
}

export function logGuestActivity(
  actorName: string,
  visitorId: string,
  action: string,
  details = "",
  property?: { id: string; title: string } | null,
) {
  db.prepare(`
    INSERT INTO site_activity_log (id, actorName, visitorId, action, details, propertyId, propertyTitle)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), actorName.slice(0, 120), visitorId.slice(0, 100), action.slice(0, 100), details.slice(0, 1000), property?.id ?? null, property?.title ?? null);
}

// Run lightweight schema setup on the active connection as well as during a
// fresh database creation, so Next.js hot reloads can safely add new tables.
db.exec(`
  CREATE TABLE IF NOT EXISTS member_activity_log (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    propertyId TEXT,
    propertyTitle TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS member_activity_user_created_idx ON member_activity_log(userId, createdAt);
  CREATE TABLE IF NOT EXISTS site_activity_log (
    id TEXT PRIMARY KEY,
    userId TEXT,
    actorName TEXT NOT NULL DEFAULT '',
    visitorId TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    propertyId TEXT,
    propertyTitle TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS site_activity_created_idx ON site_activity_log(createdAt);
  INSERT OR IGNORE INTO site_activity_log (id, userId, actorName, action, details, propertyId, propertyTitle, createdAt)
    SELECT member_activity_log.id, member_activity_log.userId, COALESCE(users.name, 'Member'), member_activity_log.action,
      member_activity_log.details, member_activity_log.propertyId, member_activity_log.propertyTitle, member_activity_log.createdAt
    FROM member_activity_log LEFT JOIN users ON users.id = member_activity_log.userId;
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS seller_phone_clicks (
    id TEXT PRIMARY KEY,
    propertyId TEXT NOT NULL,
    propertyTitle TEXT NOT NULL,
    sellerName TEXT NOT NULL,
    userId TEXT NOT NULL DEFAULT '',
    userName TEXT NOT NULL DEFAULT '',
    userPhone TEXT NOT NULL DEFAULT '',
    visitorId TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS seller_phone_clicks_created_idx ON seller_phone_clicks(createdAt);
`);

db.exec(`
  INSERT OR IGNORE INTO site_activity_log
    (id, actorName, visitorId, action, details, propertyId, propertyTitle, createdAt)
  SELECT 'legacy-phone:' || id,
    CASE WHEN visitorId = '' THEN 'Guest visitor' ELSE 'Guest ' || substr(visitorId, 1, 8) END,
    visitorId,
    CASE WHEN contactMethod = 'whatsapp' THEN 'Opened WhatsApp contact' ELSE 'Opened seller phone' END,
    CASE WHEN contactMethod = 'whatsapp' THEN 'Prepared a WhatsApp message to NILAY customer care.' ELSE 'Selected the seller phone number.' END,
    propertyId, propertyTitle, createdAt
  FROM seller_phone_clicks WHERE userId = '';
  INSERT OR IGNORE INTO site_activity_log
    (id, actorName, action, details, propertyId, propertyTitle, createdAt)
  SELECT 'legacy-inquiry:' || inquiries.id, inquiries.name, 'Enquiry sent',
    'Requested more information.', inquiries.propertyId, properties.title, inquiries.createdAt
  FROM inquiries JOIN properties ON properties.id = inquiries.propertyId
  WHERE inquiries.userId IS NULL;
`);

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
    price: typeof row.price === "number" ? row.price : Number(row.price || 0),
    area: typeof row.area === "number" ? row.area : Number(row.area || 0),
    unit: typeof row.unit === "string" ? row.unit : "sq. yd.",
    pricePerSqYd: calculatePricePerSqYd(Number(row.price || 0), Number(row.area || 0), String(row.unit || "sq. yd.")) ?? undefined,
    isNegotiable: (row.isNegotiable as Property["isNegotiable"]) || "",
    documentStatus: (row.documentStatus as Property["documentStatus"]) || "seller_declared",
    legalDisclaimerAgreed: row.legalDisclaimerAgreed === undefined ? true : Boolean(row.legalDisclaimerAgreed),
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : (typeof row.createdAt === "string" ? row.createdAt : undefined),
    image,
    images: images.length ? images : image ? [image] : [],
    videos,
    amenities,
    verified: Boolean(row.verified),
    ...(row.showPhone !== undefined ? { showPhone: Boolean(row.showPhone) } : {}),
  } as unknown as Property;
}

export function publicPropertyFromRow(row: Record<string, unknown>, showSellerContacts: boolean): Property {
  const property = propertyFromRow(row) as Property & { ownerId?: string; sellerEmail?: string };
  const publicProperty: Record<string, unknown> = { ...property };
  const sellerEmail = property.sellerEmail;
  const showPhone = property.showPhone;
  delete publicProperty.sellerAuthority;
  delete publicProperty.publicationConsentAt;
  delete publicProperty.contactConsentAt;
  delete publicProperty.ownerId;
  const safeEmail = typeof sellerEmail === "string" && !sellerEmail.endsWith("@phone.nilay.invalid") ? sellerEmail : "";
  return {
    ...(publicProperty as Property),
    phone: showSellerContacts && showPhone !== false ? property.phone : "",
    ...(showSellerContacts && safeEmail ? { sellerEmail: safeEmail } : {}),
  };
}
