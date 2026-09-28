import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUploadById, findUserById } from "@/lib/store";
import { processQuestionGeneration } from "@/lib/generator";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!enforceRateLimit(req, "generate", 5, 60_000)) {
    return NextResponse.json({ error: "TOO MANY GENERATION REQUESTS. PLEASE TRY AGAIN LATER." }, { status: 429 });
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
    const { uploadId, count = 50 } = body;
    const requestedCount = Number(count);

    if (!uploadId || !Number.isInteger(requestedCount)) {
      return NextResponse.json(
        { error: "UPLOAD ID IS REQUIRED FOR QUESTION GENERATION." },
        { status: 400 }
      );
    }

    const uploadRecord = await getUploadById(uploadId);
    if (!uploadRecord || uploadRecord.userId !== user.id) {
      return NextResponse.json(
        { error: "UPLOAD RECORD NOT FOUND OR UNAUTHORIZED." },
        { status: 404 }
      );
    }

    const questions = await processQuestionGeneration(
      user.id,
      uploadRecord.id,
      uploadRecord.extractedText,
      Math.min(Math.max(requestedCount, 10), 100)
    );

    return NextResponse.json({
      success: true,
      uploadId: uploadRecord.id,
      count: questions.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          err?.message ||
          "FAILED TO GENERATE QUESTIONS FROM UPLOADED MATERIAL.",
      },
      { status: 500 }
    );
  }
}
