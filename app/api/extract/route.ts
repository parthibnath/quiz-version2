import { requireUser } from "@/auth";
import { ApiError, apiError, readBody } from "@/lib/api";
import { extractMaterial } from "@/lib/extract";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createUpload } from "@/lib/store";
import { MAX_UPLOAD_BYTES } from "@/lib/uploads";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    enforceRateLimit(user.id, "extract", 10);
    const contentType = req.headers.get("content-type");
    if (!contentType?.startsWith("multipart/form-data;")) throw new ApiError(415, "Choose a file to upload.");
    const body = await readBody(req, MAX_UPLOAD_BYTES + 65_536);
    let form: FormData;
    try {
      form = await new Response(body, { headers: { "Content-Type": contentType } }).formData();
    } catch {
      throw new ApiError(400, "The upload could not be parsed. Choose the file and try again.");
    }
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "Choose a file or take a photo.");
    const { fileName, fileType, text, uncertain } = await extractMaterial(file, form.get("type") === "camera");
    const upload = await createUpload(user.id, fileName, fileType, text);

    return Response.json({
      success: true, uploadId: upload.id, fileName, fileType, extractedText: text,
      charCount: text.length, uncertain,
    });
  } catch (error) {
    return apiError(error);
  }
}
