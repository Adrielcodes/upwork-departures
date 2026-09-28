import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { secretMatches } from "@/lib/auth";
import { authorizeUrl } from "@/lib/upwork";

/** Owner-only: starts the Upwork OAuth flow. Visit /api/connect?key=ADMIN_KEY */
export function GET(request: NextRequest) {
  if (!secretMatches(request.nextUrl.searchParams.get("key"), process.env.ADMIN_KEY)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const state = randomBytes(16).toString("hex");
  const response = NextResponse.redirect(authorizeUrl(state));
  response.cookies.set("upwork_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/api/callback",
  });
  return response;
}
