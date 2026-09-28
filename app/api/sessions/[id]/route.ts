import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSessionById, getQuestionById, findUserById } from "@/lib/store";

export async function GET(
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

  // Fetch the immutable question snapshot for this session
  const questions = (await Promise.all(sessionItem.questionIds.map((qId) => getQuestionById(qId))))
    .filter((q): q is NonNullable<typeof q> => q !== null)
    .map((q) => ({
      id: q.id,
      questionText: q.questionText,
      options: q.options,
    }));

  return NextResponse.json({
    success: true,
    sessionId: sessionItem.id,
    sessionNumber: sessionItem.sessionNumber,
    total: sessionItem.total,
    status: sessionItem.status,
    questions,
    savedAnswers: sessionItem.userAnswers || {},
    incorrectList: sessionItem.incorrectList || [],
  });
}
