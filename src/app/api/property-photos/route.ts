import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { storePropertyPhotos } from "@/lib/property-images";

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to upload listing photos." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Please send a valid photo." }, { status: 400 });
  const photos = form.getAll("photo");
  if (photos.length !== 1 || !(photos[0] instanceof File) || photos[0].size === 0) {
    return NextResponse.json({ error: "Upload one photo at a time." }, { status: 400 });
  }

  try {
    const [image] = await storePropertyPhotos([photos[0]]);
    return NextResponse.json({ image });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "This photo could not be saved." }, { status: 400 });
  }
}
