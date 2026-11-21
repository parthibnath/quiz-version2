import { requireUser } from "@/auth";
import { ApiError, apiError, isUuid, readJson } from "@/lib/api";
import { getSession, getSessionQuestions, saveAnswer } from "@/lib/store";
import { enforceRateLimit } from "@/lib/rate-limit";

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (!isUuid(id)) throw new ApiError(404, "This session could not be found.");
    const session = await getSession(user.id, id);
    return Response.json({
      success: true,
      sessionId: session.id,
      sessionNumber: session.session_number,
      total: session.total,
      status: session.status,
      ...(session.status === "completed"
        ? { score: session.score, incorrectList: session.incorrect_list ?? [] }
        : { questions: await getSessionQuestions(user.id, session), savedAnswers: session.user_answers }),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: Request, { params }: Context) {
  try {
    const user = await requireUser();
    enforceRateLimit(user.id, "save-answer", 150);
    const { id } = await params;
    if (!isUuid(id)) throw new ApiError(404, "This session could not be found.");
    const { questionId, choice } = await readJson(req);
    if (!isUuid(questionId) || typeof choice !== "number" || !Number.isInteger(choice) || choice < 0 || choice > 3) {
      throw new ApiError(400, "Select a valid answer.");
    }
    await saveAnswer(user.id, id, questionId, choice);
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
