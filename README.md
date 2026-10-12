# Terraland

An original land-and-plot marketplace for buyers and sellers across India, built with Next.js App Router, TypeScript, and SQLite. The home page and navigation start in English, with an optional English, Hindi, and Telugu language selector.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The SQLite database is initialized and seeded automatically at `data/landmark.db` the first time a database-backed route is used. The local database directory and uploaded property photos are git-ignored.

## Marketplace features

- Explore and filter listings by keyword, city/state, land type, and price across India.
- Detailed property pages show the photo gallery, approvals, title/registration and loan details, amenities, address, map, a signed-in enquiry form, sharing tools, and an estimated EMI calculator.
- Sellers can add a Google Maps share URL to show an exact location link on a property page. Public listing APIs do not return the seller's phone number.
- Property enquiries require a signed-in account. The enquiry form uses the account name and email without requesting a phone number, saves the enquiry, and emails the account and property details to `pavansai580@gmail.com` using Resend.
- A floating headset button appears after the visitor scrolls and opens the contact page.
- View property details, read and post signed-in member reviews, and contact sellers after signing in.
- Enquiries are linked to the signed-in member and include their account name/email, message, property details, and submission time in the administrator dashboard.
- Create an account, sign in, upload multiple listing photos, edit or delete your own listings at `/my-listings`, and manage saved properties.
- Sellers can include facing, approvals, loan and registration availability, plot details, amenities, address, and nearby landmarks when creating or editing listings.
- Listing ownership is tied to the authenticated account, so members can only update or remove their own listings.
- Administrator dashboard at `/admin` for updating/removing listings and member data and reviewing enquiries and listing reviews.
- New account registrations notify `pavansai580@gmail.com` through Resend when configured; otherwise notifications remain queued for retry from the dashboard.
- English-first responsive home page with rotating landscape photography, a selector for English, Hindi, and Telugu, preference persistence, metadata, sitemap, and robots rules.
- SQLite tables for users, sessions, properties, favorites, buyer inquiries, and property reviews.
- Passwords are hashed with bcrypt; account sessions use HTTP-only, SameSite cookies.

The API is available under `/api`: `/api/auth`, `/api/properties`, `/api/favorites`, `/api/inquiries`, and `/api/reviews`. Enquiries and reviews require a signed-in account. Seed listings are defined in `src/lib/market.ts`; database schema creation and seeding live in `src/lib/db.ts`.

## Local configuration

`.env.local` contains the administrator password for this local checkout and is excluded from version control. Admin access uses the fixed email `pavansai580@gmail.com`; the password is read server-side from `ADMIN_PASSWORD` and is never embedded in frontend code.

To deliver registration and property enquiry emails, set `RESEND_API_KEY` and `EMAIL_FROM` using a verified sender address in Resend. If enquiry email delivery fails, the enquiry is saved and queued for retry from the administrator dashboard. Copy `.env.example` as a starting point.

To enable Google sign-in, create an OAuth 2.0 Web application credential in Google Cloud Console. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as server-side environment variables. Add `https://your-domain.example/api/auth/google` as an authorized redirect URI (use `http://localhost:3000/api/auth/google` for local development). Set `NEXT_PUBLIC_SITE_URL` to the same canonical site origin before deployment. Do not expose the client secret in a `NEXT_PUBLIC_` variable.

### Render persistent database and uploads

Render's default filesystem is temporary, so redeploys erase SQLite data and uploaded property media unless a persistent disk is attached. In the Render service dashboard, switch the service to a paid plan that supports disks, open **Disks**, add a disk mounted at `/var/data`, and add the environment variable `APP_DATA_DIR=/var/data`. The app stores its database at `/var/data/landmark.db` and uploads at `/var/data/uploads`; they then survive builds and restarts. Set `DATABASE_PATH` only if you want the database file at a different location under the mounted disk. Keep the service to one instance because SQLite on a disk is not shared across instances. Render does not make attached disks available during the build, so the app uses a temporary local path for the build phase and switches to the mounted disk at runtime. If the existing database is still present in the old local `data/` directory during the first startup, the app copies it into the persistent location; otherwise, restore a database backup after creating the disk. A disk cannot recover data already erased by earlier deploys.

Enquiry emails are sent through Resend to `pavansai580@gmail.com`. In Hostinger hPanel, configure `RESEND_API_KEY` and an `EMAIL_FROM` address on a domain verified with Resend. Without both values, enquiries are still saved and queued; an administrator can retry their email from the dashboard after configuring the sender.

Listings have two distinct modes: plots and land for sale, or properties for rent (including farmhouses and resorts). Public search defaults to sale; the rotating Farm house and Resort navigation labels both open the complete rental-results view, and rentals never appear in sale results. Rental property types remain available for classifying listings in Admin, but existing rentals are not hidden from the public rental view based on their type. Rental rates can be daily, nightly, monthly, or per event; visitors send enquiries through NILAY rather than paying online. Listing photos (JPEG, PNG, or WebP; up to 5 MB each) and videos (MP4 or WebM; up to 100 MB each) have no fixed item-count cap. Each file uploads in its own request before listing details are saved, avoiding a single oversized multi-file request; media files are stored under `public/uploads/`. This storage is suitable for a single persistent server; use object storage for a multi-instance or serverless deployment. The SQLite file also requires persistent storage.

Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin before deployment so canonical metadata and generated sitemap URLs use the live domain.

### Hostinger Node.js deployment

Use the `terraland-hostinger.zip` source package from this checkout. It excludes local databases, uploaded test images, Windows-built dependencies, and secret environment files. In the Hostinger Node.js app, use Node.js 22, install dependencies with `npm ci`, build with `npm run build`, and start with `npm start`. Ensure the hosting plan preserves the app's writable `data/` and `public/uploads/` directories across restarts; this SQLite-based configuration uses one running instance.

Add these server-side variables in hPanel before starting the app: `ADMIN_PASSWORD`, `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, and `EMAIL_FROM`. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to enable Google sign-in. In Google Cloud Console, register `https://your-domain.example/api/auth/google` as an authorized redirect URI. Keep all credentials out of source files and do not use a `NEXT_PUBLIC_` prefix for secrets.

## Build and host on a server

This project is configured to generate a Next.js standalone production build. For a Linux server with Docker installed:

1. Copy the project to the server, create a `.env` file based on `.env.example`, and set a strong unique `ADMIN_PASSWORD`, the canonical `NEXT_PUBLIC_SITE_URL`, and any Resend settings. Do not commit or share `.env`.
2. Build the server image on the host (or on a machine with the same CPU architecture). Pass the public site URL at build time because Next.js embeds `NEXT_PUBLIC_` values in the build:

   ```sh
   docker build --build-arg NEXT_PUBLIC_SITE_URL=https://your-domain.example -t terraland .
   ```

3. Start one persistent instance and retain the SQLite database and uploaded photos across restarts:

   ```sh
   docker run -d --name terraland --restart unless-stopped \
     -p 3000:3000 --env-file .env \
     -v terraland-data:/app/data \
     -v terraland-uploads:/app/public/uploads \
     terraland
   ```

   Put a TLS-enabled reverse proxy such as Caddy or Nginx in front of port 3000. Back up both persistent volumes. This SQLite/local-upload configuration is for one server instance; do not run multiple app replicas against the same SQLite file. For multi-instance hosting, migrate the database and image storage to managed services.

The production build also creates `.next/standalone`. The supplied Dockerfile assembles that output with its required static assets and starts it with the supported standalone server entry point. Build the Docker image on the target server (or on a machine with the same operating system and CPU architecture), especially because SQLite uses a native Node.js module.

### Linux x64 source ZIP

`terraland-linux-x64-source.zip` is a source deployment bundle, not a precompiled Linux binary. It excludes Windows-built dependencies, the local database, uploaded photos, and all `.env` files except `.env.example`. Copy it to a Linux x64 server with Docker installed and follow `HOSTING-LINUX.txt`. The included Dockerfile builds the standalone app and SQLite native module on Linux for the server.

Do not run the Windows `.next/standalone` build on Linux: SQLite includes a native module and production builds must match the target operating system and architecture.

The optional English, Hindi, and Telugu selector translates supported fixed interface phrases in the browser without reloading or sending page text to a translation service. Seller-entered listing titles and descriptions remain in their original language.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

This starter uses a local SQLite file and sample listings. For a multi-instance production deployment, use a managed database such as PostgreSQL, configure persistent image storage, add production-grade account recovery and email/phone verification, and rotate administrator credentials before launch.
