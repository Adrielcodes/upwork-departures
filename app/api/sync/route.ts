import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { secretMatches } from "@/lib/auth";
import { syncSnapshot } from "@/lib/snapshot";

export const maxDuration = 60;

/**
 * Refreshes the board from Upwork.
 * Called daily by Vercel Cron (Authorization: Bearer CRON_SECRET), or manually with ?key=ADMIN_KEY.
 */
export async function GET(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer /, "");
  const authorized =
    secretMatches(bearer, process.env.CRON_SECRET) ||
    secretMatches(request.nextUrl.searchParams.get("key"), process.env.ADMIN_KEY);
  if (!authorized) return new NextResponse("Not found", { status: 404 });

  try {
    const snapshot = await syncSnapshot();
    revalidatePath("/");
    // Only counts go back — never the data itself
    return NextResponse.json({ ok: true, flights: snapshot.flights.length, generatedAt: snapshot.generatedAt });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
