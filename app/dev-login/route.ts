import { NextResponse, type NextRequest } from "next/server";
import { DEV_AUTH_COOKIE, ensureDevAuthProfile } from "@/lib/dev-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { user } = await ensureDevAuthProfile();
    const response = NextResponse.redirect(new URL("/feed", request.url));

    response.cookies.set(DEV_AUTH_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/"
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error && error.message === "DEV_AUTH_BYPASS_DISABLED"
        ? "개발용 우회 로그인이 꺼져 있습니다."
        : "개발용 우회 로그인을 준비하지 못했어요. Supabase 서버 환경변수를 확인해주세요.";

    return NextResponse.json(
      {
        data: null,
        error: {
          code: "DEV_LOGIN_FAILED",
          message
        }
      },
      { status: 403 }
    );
  }
}
