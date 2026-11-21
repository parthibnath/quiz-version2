import { requireUser } from "@/auth";
import { ApiError, apiError, isUuid, readJson } from "@/lib/api";
import { getUpload, getRecentQuestions, saveQuestions } from "@/lib/store";
import { createBatches, generateBatch, getProvider } from "@/lib/generator";
import { enforceRateLimit } from "@/lib/rate-limit";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { uploadId, count = 50 } = await readJson(req);
    if (!isUuid(uploadId) || typeof count !== "number" || !Number.isInteger(count) || count < 1 || count > 50) {
      throw new ApiError(400, "Select saved study material and request between 1 and 50 questions.");
    }
    const upload = await getUpload(user.id, uploadId);
    if (!upload) throw new ApiError(404, "This study material could not be found.");
    const provider = getProvider();
    enforceRateLimit(user.id, "generate", 3);
    const existing = await getRecentQuestions(user.id, uploadId);
    const signal = AbortSignal.any([req.signal, AbortSignal.timeout(90_000)]);
    const batches = await Promise.allSettled(createBatches(upload.extracted_text, count)
      .map((batch) => generateBatch(provider, batch, existing, signal)));

    const questions = batches.flatMap((batch) => batch.status === "fulfilled" ? batch.value : []);
    const failed = batches.find((batch) => batch.status === "rejected");
    if (!questions.length && failed) throw failed.reason;

    const added = questions.length ? await saveQuestions(user.id, uploadId, questions) : 0;
    return Response.json({
      success: true, uploadId, count: added,
      note: failed
        ? "Some generation batches failed. New questions were saved. You can retry to add more."
        : added < count ? "Fewer unique questions were available from this run. Try again or use more detailed notes." : null,
    });
  } catch (error) {
    return apiError(error);
  }
}
