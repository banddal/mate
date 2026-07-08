# Mate Email Auth Setup

Mate uses email OTP code login for the public test flow.

## Why

Supabase magic links with PKCE can fail when the email link opens in a mail app webview, another browser, an incognito window, or another device. This is expected PKCE behavior, but it is too fragile for Mate's login test flow.

The app now asks users to enter a 6-digit email code directly on `/login`.

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

The template may keep `{{ .ConfirmationURL }}` as a fallback, but the visible 6-digit code is required for the current app login flow.

## User Flow

1. User enters email on `/login`.
2. Supabase sends email with a 6-digit token.
3. User copies the token from email.
4. User enters the token on the same `/login` screen.
5. App calls `supabase.auth.verifyOtp({ email, token, type: "email" })`.
6. Session is created without opening any email link.
