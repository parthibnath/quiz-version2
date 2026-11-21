import { requireUser } from "@/auth";
import { ApiError, apiError, readJson } from "@/lib/api";
import { createSession } from "@/lib/store";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    enforceRateLimit(user.id, "start-session", 20);
    const { sessionNumber } = await readJson(req);
    if (typeof sessionNumber !== "number" || !Number.isInteger(sessionNumber) || sessionNumber < 1 || sessionNumber > 11) {
      throw new ApiError(400, "Choose a session from 1 to 11.");
    }
    const session = await createSession(user.id, sessionNumber);
    return Response.json({ success: true, sessionId: session.id, sessionNumber, total: session.total });
  } catch (error) {
    return apiError(error);
  }
}
