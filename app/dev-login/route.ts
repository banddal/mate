import { NextResponse, type NextRequest } from "next/server";
import { DEV_AUTH_COOKIE, DEV_AUTH_FALLBACK_USER_ID } from "@/lib/dev-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/feed", request.url));

  response.cookies.set(DEV_AUTH_COOKIE, DEV_AUTH_FALLBACK_USER_ID, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/"
  });

  return response;
}
