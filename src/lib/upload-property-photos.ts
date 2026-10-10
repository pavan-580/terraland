export async function uploadPropertyPhotos(files: File[], onProgress?: (uploaded: number, total: number) => void) {
  const images: string[] = [];
  onProgress?.(0, files.length);

  for (const [index, file] of files.entries()) {
    const form = new FormData();
    form.append("photo", file, file.name);
    let response: Response;
    try {
      response = await fetch("/api/property-photos", { method: "POST", body: form });
    } catch {
      throw new Error(`Photo ${index + 1} of ${files.length} could not be uploaded. Check your connection and try again.`);
    }

    const result: unknown = await response.json().catch(() => null);
    if (!result || typeof result !== "object") {
      throw new Error(`Photo ${index + 1} of ${files.length} could not be uploaded. Please try again.`);
    }
    const data = result as { error?: string; image?: string };
    if (!response.ok) throw new Error(data.error ?? `Photo ${index + 1} of ${files.length} could not be uploaded.`);
    if (typeof data.image !== "string" || !/^\/uploads\/[a-zA-Z0-9._-]+$/.test(data.image)) {
      throw new Error(`Photo ${index + 1} of ${files.length} returned an invalid upload result.`);
    }
    images.push(data.image);
    onProgress?.(images.length, files.length);
  }
  return images;
}
