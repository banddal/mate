# Mate Codex Handoff R59

## Summary
- Removed email magic link / OTP login from the active public test flow.
- Replaced the login screen with a single Google OAuth entry point.
- Removed the custom email OTP request route and deprecated SMTP setup docs.

## Why
- Gmail/Supabase SMTP was blocking product validation with repeated send failures.
- The current version is a lightweight test build, so auth should not consume more time than the user-side flow.
- Google account login is a better fit for the initial membership/login assumption.

## Changed
- `app/login/LoginForm.tsx`
  - Rebuilt around `supabase.auth.signInWithOAuth({ provider: "google" })`.
  - Removed email input, OTP code input, resend cooldown, and mail-send errors.
- `app/api/auth/email/request/route.ts`
  - Removed because SMTP email auth is no longer part of the active flow.
- `lib/supabase/browser.ts`
  - Restored `flowType: "pkce"` for OAuth.
- `app/auth/confirm/AuthConfirmClient.tsx`
  - Reworded callback errors around Google login instead of email links.
- `Mate_Auth_Setup.md`
  - Added current Google OAuth setup notes and marked SMTP/email auth as deprecated.

## Verification
- Run GitHub Actions and Vercel after push.
- Manual test should start at `/login`, click Google, return through `/auth/confirm`, then continue to `/onboarding`.
