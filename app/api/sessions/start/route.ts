import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { findUserById, createSession, isSessionUnlocked } from "@/lib/store";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!enforceRateLimit(req, "session-start", 20, 60_000)) {
    return NextResponse.json({ error: "TOO MANY SESSION REQUESTS. PLEASE TRY AGAIN LATER." }, { status: 429 });
  }
  const session = await auth();

  if (!session || !session.user?.email) {
    return NextResponse.json(
      { error: "UNAUTHORIZED ACCESS. PLEASE LOG IN FIRST." },
      { status: 401 }
    );
  }

  const user = await findUserById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "USER NOT FOUND." }, { status: 404 });
  }

  try {
    const body = await req.json();
    const sessionNumber = Number(body.sessionNumber);

    if (isNaN(sessionNumber) || sessionNumber < 1 || sessionNumber > 11) {
      return NextResponse.json(
        { error: "INVALID SESSION NUMBER. MUST BE BETWEEN 1 AND 11." },
        { status: 400 }
      );
    }

    if (!isSessionUnlocked(user, sessionNumber)) {
      return NextResponse.json(
        {
          error: `SESSION ${sessionNumber} IS LOCKED. COMPLETE PREVIOUS SESSIONS FIRST TO UNLOCK.`,
        },
        { status: 403 }
      );
    }

    const newSession = await createSession(user.id, sessionNumber);

    return NextResponse.json({
      success: true,
      sessionId: newSession.id,
      sessionNumber: newSession.sessionNumber,
      total: newSession.total,
    });
  } catch (err: any) {
    const message = err?.message || "FAILED TO START SESSION.";
    const isClientError =
      message.includes("LOCKED") || message.includes("NOT ENOUGH VALID QUESTIONS");
    return NextResponse.json(
      { error: message },
      { status: isClientError ? 400 : 500 }
    );
  }
}
