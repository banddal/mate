import { NextResponse, type NextRequest } from "next/server";
import { DEV_AUTH_COOKIE } from "@/lib/dev-auth";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(DEV_AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/"
  });

  return response;
}
