import { requireUser } from "@/auth";
import { ApiError, apiError, isUuid, readJson } from "@/lib/api";
import { submitSession } from "@/lib/store";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    enforceRateLimit(user.id, "submit-session", 20);
    const { id } = await params;
    if (!isUuid(id)) throw new ApiError(404, "This session could not be found.");
    const { userAnswers } = await readJson(req);
    if (!userAnswers || typeof userAnswers !== "object" || Array.isArray(userAnswers)) {
      throw new ApiError(400, "Provide your answers before submitting.");
    }
    const session = await submitSession(user.id, id, userAnswers);
    return Response.json({
      success: true,
      sessionId: session.id,
      sessionNumber: session.session_number,
      score: session.score,
      total: session.total,
      percentage: Math.round((session.score / session.total) * 100),
      incorrectList: session.incorrect_list ?? [],
    });
  } catch (error) {
    return apiError(error);
  }
}
