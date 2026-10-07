/**
 * Direct Supabase Storage Photo Uploader
 * Uploads real food photos to the Supabase public 'menu-photos' bucket
 * and returns the permanent CDN URL for the dish.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BUCKET_NAME = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "menu-photos";

export async function uploadFoodPhotoToSupabase(file: File): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase credentials missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment configuration."
    );
  }
  if (!file) {
    throw new Error("No file selected for upload.");
  }

  // Validate image MIME type
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files (JPG, PNG, WebP) are allowed.");
  }

  // File size guard (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Image size must be less than 10MB.");
  }

  const rawExt = file.name.split(".").pop() || "jpg";
  const cleanExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const fileName = `dish_${Date.now()}_${randomSuffix}.${cleanExt}`;

  // Supabase Storage REST endpoint for object upload
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${fileName}`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": file.type || "image/jpeg",
      "x-upsert": "true",
    },
    body: file,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Photo upload failed (${response.status}): ${
        errorText || "Could not save to Supabase Storage bucket. Please check bucket RLS policy."
      }`
    );
  }

  // Public permanent URL
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${fileName}`;
  return publicUrl;
}
