"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { identifyUser, initAnalytics, isAnalyticsEnabled, capturePageview } from "@/lib/analytics";

export function AnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    capturePageview(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!isAnalyticsEnabled()) {
      return;
    }

    const hasSupabasePublicEnv = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    if (!hasSupabasePublicEnv) {
      return;
    }

    const supabase = createBrowserSupabaseClient();

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        identifyUser(data.user.id);
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        identifyUser(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
