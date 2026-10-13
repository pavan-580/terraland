import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { db, logMemberActivity } from "@/lib/db";
import { deliverPendingRegistrationNotices } from "@/lib/notifications";
import { newId, startSession } from "@/lib/session";

const adminEmail = "pavansai580@gmail.com";
const oauthStateCookie = "terraland_google_state";
const oauthNextCookie = "terraland_google_next";

function safeDestination(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function getOrigin(request: NextRequest) {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).origin;
}

function signInRedirect(request: NextRequest, code: string, destination: string) {
  const url = new URL("/sign-in", getOrigin(request));
  url.searchParams.set("googleError", code);
  if (destination !== "/") url.searchParams.set("next", destination);
  return NextResponse.redirect(url);
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackUrl = `${getOrigin(request)}/api/auth/google`;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (!code) {
    if (oauthError) return signInRedirect(request, "cancelled", safeDestination(request.cookies.get(oauthNextCookie)?.value));
    if (!clientId || !clientSecret) return signInRedirect(request, "not_configured", safeDestination(request.nextUrl.searchParams.get("next") ?? undefined));
    const next = safeDestination(request.nextUrl.searchParams.get("next") ?? undefined);
    const csrfState = randomBytes(32).toString("base64url");
    const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", callbackUrl);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "openid email profile");
    authorizeUrl.searchParams.set("state", csrfState);
    authorizeUrl.searchParams.set("prompt", "select_account");
    const response = NextResponse.redirect(authorizeUrl);
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/api/auth/google",
      maxAge: 600,
    };
    response.cookies.set(oauthStateCookie, csrfState, cookieOptions);
    response.cookies.set(oauthNextCookie, next, cookieOptions);
    return response;
  }

  const destination = safeDestination(request.cookies.get(oauthNextCookie)?.value);
  const storedState = request.cookies.get(oauthStateCookie)?.value;
  const clearOAuthCookies = (response: NextResponse) => {
    response.cookies.set(oauthStateCookie, "", { path: "/api/auth/google", maxAge: 0 });
    response.cookies.set(oauthNextCookie, "", { path: "/api/auth/google", maxAge: 0 });
    return response;
  };
  if (!clientId || !clientSecret) return clearOAuthCookies(signInRedirect(request, "not_configured", destination));
  if (!state || !storedState || state !== storedState) {
    return clearOAuthCookies(signInRedirect(request, "invalid_state", destination));
  }

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    console.error("Google OAuth token exchange failed:", error);
    return clearOAuthCookies(signInRedirect(request, "failed", destination));
  }
  const tokenData = objectValue(await tokenResponse.json().catch(() => null));
  const accessToken = tokenData?.access_token;
  if (!tokenResponse.ok || typeof accessToken !== "string") {
    console.error("Google OAuth token exchange returned an invalid response:", tokenResponse.status);
    return clearOAuthCookies(signInRedirect(request, "failed", destination));
  }

  let profileResponse: Response;
  try {
    const authorization = ["Bearer", accessToken].join(" ");
    profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    console.error("Google account profile request failed:", error);
    return clearOAuthCookies(signInRedirect(request, "failed", destination));
  }
  const profile = objectValue(await profileResponse.json().catch(() => null));
  const email = typeof profile?.email === "string" ? profile.email.trim().toLowerCase() : "";
  const name = typeof profile?.name === "string" ? profile.name.trim() : "";
  if (!profileResponse.ok || profile?.verified_email !== true || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("Google OAuth did not return a verified email address:", profileResponse.status);
    return clearOAuthCookies(signInRedirect(request, "unverified_email", destination));
  }
  if (email === adminEmail) return clearOAuthCookies(signInRedirect(request, "admin_not_allowed", destination));

  let user = db.prepare("SELECT id, name, email FROM users WHERE email = ?").get(email) as
    { id: string; name: string; email: string } | undefined;
  if (!user) {
    const id = newId();
    const notificationId = newId();
    const userName = name.length >= 2 && name.length <= 80 ? name : email.split("@")[0].slice(0, 80);
    const passwordHash = await hash(randomBytes(32).toString("base64url"), 12);
    const createAccount = db.transaction(() => {
      db.prepare("INSERT INTO users (id, name, email, passwordHash, role) VALUES (?, ?, ?, ?, 'user')")
        .run(id, userName, email, passwordHash);
      logMemberActivity(id, "Account created", "Joined NILAY with Google.");
      db.prepare("INSERT INTO registration_notifications (id, name, email) VALUES (?, ?, ?)")
        .run(notificationId, userName, email);
    });
    try {
      createAccount();
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("UNIQUE constraint failed")) throw error;
      user = db.prepare("SELECT id, name, email FROM users WHERE email = ?").get(email) as
        { id: string; name: string; email: string } | undefined;
    }
    if (!user) {
      user = { id, name: userName, email };
      await deliverPendingRegistrationNotices(notificationId);
    }
  }

  if (!user) return clearOAuthCookies(signInRedirect(request, "failed", destination));
  const token = startSession(user.id);
  const response = NextResponse.redirect(new URL(destination, getOrigin(request)));
  response.cookies.set("landmark_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return clearOAuthCookies(response);
}
