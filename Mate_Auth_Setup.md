# Mate Auth Setup

Mate no longer uses email magic links, email OTP, or custom SMTP for the public test flow.

## Current Test Flow

1. User opens `/login`.
2. User clicks `Google 계정으로 시작하기`.
3. Supabase starts Google OAuth.
4. Google redirects back to `/auth/confirm`.
5. Mate exchanges the OAuth code for a Supabase session.
6. User continues to `/onboarding`.

## Required Supabase Setup

In Supabase Dashboard:

1. Open Authentication > Providers.
2. Enable Google.
3. Add the Google OAuth client ID and secret.
4. Open Authentication > URL Configuration.
5. Set Site URL:

```txt
https://mate-161company.vercel.app
```

6. Add Redirect URLs:

```txt
https://mate-161company.vercel.app/auth/confirm
https://mate-161company.vercel.app/**
http://localhost:3000/**
```

## Required Google Cloud Setup

In Google Cloud Console OAuth Client:

```txt
Authorized JavaScript origins:
https://mate-161company.vercel.app

Authorized redirect URIs:
https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback
```

Supabase Google OAuth normally redirects through Supabase's callback URL first, then Supabase sends
the user to Mate's `/auth/confirm`.

## Vercel Deployment Protection

Google OAuth callback testing requires the production app to be publicly reachable.

Check:

```txt
https://mate-161company.vercel.app/api/config
```

This should return Mate JSON. If it shows a Vercel login page, turn off Deployment Protection for the
Production deployment before testing auth callbacks.

## Deprecated

The following flows are intentionally not used in the current test version:

- Email magic link
- Email OTP code login
- Custom SMTP / Gmail SMTP
- Phone OTP login

They can be revisited after the core user-side product flow is stable.
