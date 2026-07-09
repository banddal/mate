"use client";

import posthog from "posthog-js";

export type AnalyticsEvent =
  | "login_success"
  | "onboarding_complete"
  | "card_view"
  | "card_created"
  | "card_apply_submitted"
  | "applicant_approved"
  | "room_entered"
  | "review_submitted";

let initialized = false;

export function isAnalyticsEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

export function initAnalytics() {
  if (initialized || !isAnalyticsEnabled() || typeof window === "undefined") {
    return;
  }

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    // App Router SPA 네비게이션은 AnalyticsProvider에서 수동 캡처한다.
    capture_pageview: false,
    capture_pageleave: true,
    persistence: "localStorage+cookie"
  });

  initialized = true;
}

export function capturePageview(pathname: string) {
  if (!initialized) {
    return;
  }

  posthog.capture("$pageview", { $current_url: window.location.origin + pathname });
}

export function captureEvent(event: AnalyticsEvent, properties?: Record<string, unknown>) {
  if (!initialized) {
    return;
  }

  posthog.capture(event, properties);
}

export function identifyUser(userId: string) {
  if (!initialized) {
    return;
  }

  if (posthog.get_distinct_id() !== userId) {
    posthog.identify(userId);
  }
}

export function resetAnalyticsIdentity() {
  if (!initialized) {
    return;
  }

  posthog.reset();
}
