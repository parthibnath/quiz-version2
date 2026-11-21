import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function apiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Quiz request failed", error);
  return NextResponse.json({ error: "The server could not finish this request. Please try again." }, { status: 500 });
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const text = new TextDecoder().decode(await readBody(req, 16_384));
  try {
    const body = JSON.parse(text);
    if (body && typeof body === "object" && !Array.isArray(body)) return body;
  } catch {}
  throw new ApiError(400, "Send a valid JSON object.");
}

export async function readBody(req: Request, limit: number) {
  if (Number(req.headers.get("content-length")) > limit) {
    throw new ApiError(413, "This upload exceeds the allowed size.");
  }
  const reader = req.body?.getReader();
  let bytes = 0;
  const chunks: Buffer[] = [];
  try {
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > limit) {
          await reader.cancel();
          throw new ApiError(413, "This upload exceeds the allowed size.");
        }
        chunks.push(Buffer.from(value));
      }
    }
  } finally {
    reader?.releaseLock();
  }
  return new Uint8Array(Buffer.concat(chunks, bytes));
}
