import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSessionById, submitSessionAnswers, findUserById } from "@/lib/store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id: sessionId } = await params;
  const sessionItem = await getSessionById(sessionId);

  if (!sessionItem || sessionItem.userId !== user.id) {
    return NextResponse.json(
      { error: "SESSION NOT FOUND OR UNAUTHORIZED." },
      { status: 404 }
    );
  }

  try {
    const body = await req.json();
    const userAnswers = body.userAnswers || {};

    const result = await submitSessionAnswers(sessionId, userAnswers);
    const percentage = Math.round((result.score / result.total) * 100);

    return NextResponse.json({
      success: true,
      sessionId: result.session.id,
      sessionNumber: result.session.sessionNumber,
      score: result.score,
      total: result.total,
      percentage,
      incorrectList: result.incorrectList,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "FAILED TO SUBMIT SESSION ANSWERS." },
      { status: 500 }
    );
  }
}
