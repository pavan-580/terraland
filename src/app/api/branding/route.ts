import { NextRequest, NextResponse } from "next/server";
import { getSiteSetting, setSiteSetting } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { storePropertyPhotos } from "@/lib/property-images";

export const dynamic = "force-dynamic";

export async function GET() {
  const customLogo = getSiteSetting("siteLogoUrl");
  return NextResponse.json({
    logoUrl: customLogo || "/nilay-logo.png",
    isCustom: Boolean(customLogo),
  }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Administrator authorization required." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form payload." }, { status: 400 });
  }

  // Handle reset to default
  if (formData.get("reset") === "true") {
    setSiteSetting("siteLogoUrl", "");
    return NextResponse.json({
      message: "Logo reset to default NILAY brand mark.",
      logoUrl: "/nilay-logo.png",
      isCustom: false,
    });
  }

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Please select an image file to upload as the logo." }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Logo file size must be under 5 MB." }, { status: 400 });
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
  if (!allowedTypes.includes(file.type) && !/\.(png|jpe?g|webp|svg)$/i.test(file.name)) {
    return NextResponse.json({ error: "Logo must be a PNG, JPG, WebP, or SVG image." }, { status: 400 });
  }

  try {
    const urls = await storePropertyPhotos([file]);
    if (!urls.length) {
      return NextResponse.json({ error: "Failed to store uploaded logo image." }, { status: 500 });
    }
    const newLogoUrl = urls[0];
    setSiteSetting("siteLogoUrl", newLogoUrl);

    return NextResponse.json({
      message: "Website logo has been successfully updated across all pages.",
      logoUrl: newLogoUrl,
      isCustom: true,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Logo upload failed.",
    }, { status: 500 });
  }
}
