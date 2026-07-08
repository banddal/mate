# Mate Codex Handoff R54

## Summary
- Clarified the public test auth flow as email authentication, not code-only login.
- Kept support for both Supabase email links and visible 6-digit email codes.
- Removed phone OTP from the required onboarding path for the current lightweight test version.

## Why
- Supabase was still sending link-based emails in the current project setup, so the login UI should not promise that only a number code will arrive.
- Phone login/SMS verification is not fully connected yet and was blocking user-side flow testing.
- The test build should let users authenticate by email, set a minimal profile, and immediately inspect the main user experience.

## Changed
- `app/login/LoginForm.tsx`
  - Renamed the primary email action to "이메일 인증 받기".
  - Updated sent-state guidance to allow either clicking the email link or entering a visible 6-digit code.
  - Reworded the top trust note to remove phone verification from the signup promise.
- `app/auth/confirm/AuthConfirmClient.tsx`
  - Updated failed-link recovery copy to request a new email authentication attempt.
  - Avoided saying links are no longer supported.
- `app/onboarding/OnboardingForm.tsx`
  - Removed required phone OTP UI and related client state.
  - Profile save now sends the user directly to `/feed`.
  - Added a short note that phone verification is excluded until real SMS integration is ready.

## Verification
- `git diff --check` passed.
- Local full build was not run because `node_modules` was intentionally removed to keep the workspace light.
- Verify through GitHub Actions and Vercel after push.
