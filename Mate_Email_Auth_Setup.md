# Mate Email Auth Setup

Mate supports both email OTP code login and email link fallback for the public test flow.

## Why

Supabase magic links with PKCE can fail when the email link opens in a mail app webview, another browser, an incognito window, or another device. This is expected PKCE behavior, but it is too fragile for Mate's login test flow.

The app now asks users to enter a 6-digit email code directly on `/login`. It also sends email links to `/auth/confirm`, where the client can detect the returned auth session.

## Custom SMTP Requirement

Supabase's default Auth email sender is only for early testing. It can be limited to team member
addresses and currently has a very low send limit, so Mate must use a custom SMTP sender before
email login can be tested repeatedly.

For a temporary Gmail-based test sender:

```txt
SMTP host: smtp.gmail.com
SMTP port: 587
SMTP user: your-full-gmail-address@gmail.com
SMTP password: Google App Password, not the normal Gmail password
Sender email: same Gmail address as SMTP user
Sender name: Mate
Secure connection: STARTTLS / TLS
```

Gmail checklist:

1. Enable 2-Step Verification on the Google account.
2. Create an App Password for Mate/Supabase SMTP.
3. Paste the 16-character app password into Supabase SMTP settings.
4. Do not use the normal Google login password.
5. If using a Google Workspace alias, make sure the sender address is allowed as a Gmail send-as
   address. For the first test, use the exact Gmail account address as the sender.

Supabase checklist:

1. Open Authentication > Settings > SMTP.
2. Enable Custom SMTP.
3. Save the Gmail SMTP values above.
4. Open Authentication > Rate Limits.
5. Raise the email/OTP send limit from the default test value to a practical test value.
6. Send a brand-new login email from `/login`.

If `/login` still returns `email rate limit exceeded`, the custom SMTP settings are not fully active
or the Supabase Auth email rate limit is still too low. This is not controlled by the Next.js app.

If `/login` returns:

```txt
Supabase Auth HTTP 500: Error sending magic link email
```

Supabase accepted the OTP request but failed while sending through the configured SMTP provider. This
usually means the SMTP credentials or sender settings are wrong. For Gmail, regenerate the Google App
Password, use port `587`, use the full Gmail address as both SMTP user and sender email, and make sure
Custom SMTP is saved/enabled in Supabase.

## Vercel Deployment Protection

Email authentication cannot be fully tested while the production deployment is protected by Vercel
login or SSO. Supabase email links must be able to open the public callback URL directly:

```txt
https://mate-161company.vercel.app/auth/confirm
```

If an anonymous request to the app redirects to a Vercel login page, turn off Deployment Protection
for the Production deployment before testing email auth. Otherwise the email may be sent, but the
callback can be intercepted before Mate handles the session.

Quick external check:

```txt
https://mate-161company.vercel.app/api/config
```

This should return Mate JSON. If it shows a Vercel login page, Deployment Protection is still active.

## Current Code Check

Mate's `/login` page calls:

```ts
supabase.auth.signInWithOtp({
  email,
  options: { emailRedirectTo }
})
```

The app does not call `resetPasswordForEmail()` in the login flow. If Supabase logs show
`User recovery requested`, that request is not coming from the current Mate login form and should be
checked against another deployed version, browser cache, an old preview deployment, or a different
Auth template/test action.

The login form also blocks duplicate email requests in the same click cycle and adds a 60-second
resend cooldown. This reduces accidental multiple `/auth/v1/otp` calls, but it does not replace
custom SMTP setup.

The email request now goes through Mate's server route:

```txt
POST /api/auth/email/request
```

This route calls Supabase Auth's `/auth/v1/otp` endpoint directly and normalizes empty responses into
actionable messages for rate limits, provider timeouts, unauthorized emails, and SMTP-related
failures. If Supabase returns an HTTP status and response body, the app should now expose it instead
of showing `{}`.

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
