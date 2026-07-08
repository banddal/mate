# Mate Email Auth Setup

Mate supports both email OTP code login and email link fallback for the public test flow.

## Why

Supabase magic links with PKCE can fail when the email link opens in a mail app webview, another browser, an incognito window, or another device. This is expected PKCE behavior, but it is too fragile for Mate's login test flow.

The app now asks users to enter a 6-digit email code directly on `/login`. It also sends email links to `/auth/confirm`, where the client can detect the returned auth session.

## Supabase Email Template Requirement

In Supabase Dashboard:

1. Open Authentication.
2. Open Email Templates.
3. Edit the Magic Link / OTP sign-in template.
4. Make sure the email body visibly includes:

```txt
{{ .Token }}
```

Recommended Korean copy:

```txt
Mate 로그인 코드

아래 6자리 코드를 로그인 화면에 입력해주세요.

{{ .Token }}

이 링크를 직접 열 필요는 없습니다.
```

The template may keep `{{ .ConfirmationURL }}` as a fallback. The visible 6-digit code is still recommended because email links can be opened by mail-app webviews, but links are no longer routed through the PKCE-only server callback.

## User Flow

1. User enters email on `/login`.
2. Supabase sends email with a 6-digit token.
3. User copies the token from email.
4. User enters the token on the same `/login` screen.
5. App calls `supabase.auth.verifyOtp({ email, token, type: "email" })`.
6. Session is created without opening any email link.

## Link Fallback Flow

1. User enters email on `/login`.
2. Supabase sends an email with a confirmation URL.
3. User opens the email link.
4. The link redirects to `/auth/confirm`.
5. The client page detects the auth session or verifies a token hash when present.
6. User is sent to onboarding.
