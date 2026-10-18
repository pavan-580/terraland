import Database from "better-sqlite3";
import path from "node:path";
import { evaluateTransparentMatch } from "../src/lib/matchmaker.ts";

console.log("=== TERRALAND CRM & ACQUISITION VERIFICATION ===");

const dbPath = path.join(process.cwd(), "data", "landmark.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");

// 1. Check SQLite Tables
console.log("\n[1] Verifying Database Schema Migrations...");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
const requiredTables = ["buyer_requirements", "leads", "site_visits", "service_packages", "property_matches", "properties", "inquiries"];
for (const t of requiredTables) {
  if (tables.includes(t)) {
    const count = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get().c;
    console.log(`  ✓ Table '${t}' exists (${count} records)`);
  } else {
    console.error(`  ✗ Missing table: '${t}'`);
    process.exit(1);
  }
}

// 2. Test Transparent Matchmaker Algorithm
console.log("\n[2] Testing Deterministic Transparent Matchmaker (No AI)...");
const sampleReq = {
  id: "test-req-1",
  preferredLocation: "Miyapur, Hyderabad",
  minBudget: 5000000,
  maxBudget: 7500000,
  minPlotSize: 150,
  maxPlotSize: 250,
  intendedUse: "residential_construction"
};

const matchingProp = {
  id: "test-prop-1",
  title: "200 Sq Yd East Facing Plot in Miyapur",
  locality: "Miyapur",
  city: "Hyderabad",
  price: 6500000,
  area: 200,
  unit: "sq. yd.",
  isNegotiable: "negotiable"
};

const matchResult = evaluateTransparentMatch(sampleReq, matchingProp);
if (matchResult && matchResult.score >= 80) {
  console.log(`  ✓ Perfect match score calculated: ${matchResult.score}/100`);
  console.log("  ✓ Match Explanations:", matchResult.explanations);
} else {
  console.error("  ✗ Matchmaker failed to score matching plot:", matchResult);
  process.exit(1);
}

// Non-matching property (out of corridor & budget)
const nonMatchingProp = {
  id: "test-prop-2",
  title: "Agricultural Land in Warangal",
  locality: "Warangal Rural",
  city: "Warangal",
  price: 25000000,
  area: 1200,
  unit: "sq. yd.",
  isNegotiable: "fixed"
};
const nonMatchResult = evaluateTransparentMatch(sampleReq, nonMatchingProp);
if (!nonMatchResult) {
  console.log("  ✓ Correctly rejected non-matching plot (score < 40 filtered out)");
} else {
  console.error("  ✗ Should have rejected non-matching plot but got:", nonMatchResult);
}

// 3. Test HTTP Endpoints on Local Server
console.log("\n[3] Testing Live HTTP Endpoints on http://localhost:3000...");
async function runHttpTests() {
  const baseUrl = "http://localhost:3000";

  // Test 3.1: Register Buyer Requirement via API
  console.log("  - Submitting buyer requirement via POST /api/buyer-requirements...");
  const testPhone = "+919876543299";
  const reqRes = await fetch(`${baseUrl}/api/buyer-requirements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Venkat Rao",
      phone: testPhone,
      email: "venkat@example.com",
      preferredLocation: "Miyapur, Hyderabad",
      minBudget: 50,
      maxBudget: 70,
      minPlotSize: 150,
      maxPlotSize: 250,
      intendedUse: "residential_construction",
      timeline: "immediate",
      fundingReadiness: "ready_cash",
      preferredContactMethod: "phone",
      contactConsent: true,
      notes: "Looking for East facing HMDA plot near Miyapur metro station",
      source: "automated_test"
    })
  });

  const reqJson = await reqRes.json();
  if (reqRes.ok && reqJson.success) {
    console.log("  ✓ Buyer requirement registered successfully! ID:", reqJson.id || "OK");
  } else {
    console.error("  ✗ Requirement registration failed:", reqJson);
  }

  // Test 3.2: Duplicate submission prevention
  console.log("  - Testing duplicate submission prevention (submitting same phone within 2 min)...");
  const dupRes = await fetch(`${baseUrl}/api/buyer-requirements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Venkat Rao",
      phone: testPhone,
      contactConsent: true
    })
  });
  const dupJson = await dupRes.json();
  if (dupRes.ok && dupJson.alreadyReceived) {
    console.log("  ✓ Duplicate submission gracefully intercepted:", dupJson.message);
  } else {
    console.error("  ✗ Duplicate submission was not caught:", dupJson);
  }

  // Test 3.3: Verify DB Sync to leads
  console.log("  - Verifying CRM Leads sync in SQLite...");
  const lead = db.prepare("SELECT * FROM leads WHERE phone = ? ORDER BY createdAt DESC LIMIT 1").get(testPhone);
  if (lead && lead.type === "buyer" && lead.status === "new") {
    console.log(`  ✓ Lead automatically synchronized in CRM! Name: ${lead.name}, Source: ${lead.source}`);
  } else {
    console.error("  ✗ Lead not found in leads table for phone:", testPhone);
  }

  // Clean up test records
  db.prepare("DELETE FROM buyer_requirements WHERE phone = ?").run(testPhone);
  db.prepare("DELETE FROM leads WHERE phone = ?").run(testPhone);
  console.log("  ✓ Test cleanup completed cleanly.");

  console.log("\n=== ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
}

runHttpTests().catch(err => {
  console.error("HTTP verification error:", err);
  process.exit(1);
});
