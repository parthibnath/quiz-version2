import { NextResponse } from "next/server";
import { findUserById } from "@/lib/store";

export async function GET() {
  try {
    await findUserById("__healthcheck__");
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
