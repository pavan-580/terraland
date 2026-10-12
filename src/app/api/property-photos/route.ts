import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { storePropertyPhotos, storePropertyVideos } from "@/lib/property-images";

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to upload listing media." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Please send a valid media file." }, { status: 400 });
  const photos = form.getAll("photo");
  const videos = form.getAll("video");
  if (photos.length + videos.length !== 1) return NextResponse.json({ error: "Upload one photo or video at a time." }, { status: 400 });

  try {
    if (photos[0] instanceof File && photos[0].size > 0) {
      const [image] = await storePropertyPhotos([photos[0]]);
      return NextResponse.json({ image });
    }
    if (videos[0] instanceof File && videos[0].size > 0) {
      const [video] = await storePropertyVideos([videos[0]]);
      return NextResponse.json({ video });
    }
    return NextResponse.json({ error: "Select a non-empty photo or video file." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "This media file could not be saved." }, { status: 400 });
  }
}
