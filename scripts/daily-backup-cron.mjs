const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
const secret = process.env.CRON_SECRET;

if (!siteUrl || !secret) {
  console.error("Set NEXT_PUBLIC_SITE_URL and CRON_SECRET on the Render cron service.");
  process.exit(1);
}

const response = await fetch(`${siteUrl}/api/cron/daily-backup`, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
  signal: AbortSignal.timeout(6 * 60 * 1000),
});
const body = await response.text();
console.log(body);
if (!response.ok) process.exit(1);
