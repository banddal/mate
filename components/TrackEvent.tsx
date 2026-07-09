"use client";

import { useEffect } from "react";
import { captureEvent, type AnalyticsEvent } from "@/lib/analytics";

type TrackEventProps = {
  event: AnalyticsEvent;
  properties?: Record<string, unknown>;
};

export function TrackEvent({ event, properties }: TrackEventProps) {
  useEffect(() => {
    captureEvent(event, properties);
    // 마운트 시 1회만 캡처한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
