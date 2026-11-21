import { checkDatabase } from "@/lib/store";

export async function GET() {
  try {
    await checkDatabase();
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
