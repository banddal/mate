import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next") ?? "/onboarding";

  if (error) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", errorDescription ?? error);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    try {
      const env = getPublicEnv();
      const redirectResponse = NextResponse.redirect(new URL(next, request.url));
      const supabase = createServerClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
              redirectResponse.cookies.set({ name, value, ...options });
            },
            remove(name: string, options: CookieOptions) {
              redirectResponse.cookies.set({ name, value: "", ...options });
            }
          }
        }
      );
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("error", exchangeError.message);
        return NextResponse.redirect(loginUrl);
      }

      return redirectResponse;
    } catch (callbackError) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set(
        "error",
        callbackError instanceof Error
          ? callbackError.message
          : "로그인 콜백 처리 중 문제가 생겼어요."
      );
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
