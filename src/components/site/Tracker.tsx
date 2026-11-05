import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

import { loadThirdPartyAnalytics, startClickTracking, trackPageView } from "@/lib/track";

/** Mounted once in the app shell: page views on every route change, clicks site-wide. */
export function Tracker() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    loadThirdPartyAnalytics();
    return startClickTracking();
  }, []);

  useEffect(() => {
    trackPageView();
  }, [path]);

  return null;
}
