import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { secretMatches } from "@/lib/auth";
import { syncSnapshot } from "@/lib/snapshot";
import { exchangeCode } from "@/lib/upwork";

/** Upwork redirects here after I approve access. Saves tokens and runs the first sync. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !secretMatches(state, request.cookies.get("upwork_oauth_state")?.value)) {
    return new NextResponse("Invalid or expired sign-in attempt. Start again from /api/connect.", { status: 400 });
  }

  try {
    await exchangeCode(code);
    await syncSnapshot();
    revalidatePath("/");
  } catch (err) {
    console.error(err);
    return new NextResponse(`Connected, but the first sync failed: ${err instanceof Error ? err.message : err}`, {
      status: 500,
    });
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete({ name: "upwork_oauth_state", path: "/api/callback" });
  return response;
}
