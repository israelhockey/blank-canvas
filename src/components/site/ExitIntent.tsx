import { useEffect, useRef } from "react";

import { EXIT_POPUP } from "@/lib/site-data";
import { LEAD_SENT_KEY, openQuickLead } from "./QuickLead";

const SHOWN_KEY = "ss_exit_shown";
export const PRICED_KEY = "ss_priced";

const get = (store: "local" | "session", k: string) => {
  try {
    return (store === "local" ? localStorage : sessionStorage).getItem(k);
  } catch {
    return null;
  }
};

/*
 * Leave-the-site pop-up, once per visitor, never after they've sent their info.
 *   Desktop: the mouse heads for the tabs / close button.
 *   Phones: after 40 seconds, a fast scroll back up (the usual "I'm done" gesture).
 * Used the price builder → "Save your price?"; otherwise EXIT_POPUP.offer decides:
 * "quote" → "Want your price texted to you?", "guide" → free Holiday Stain Guide by email.
 */
export function ExitIntent({ total }: { total: number }) {
  const totalRef = useRef(total);
  totalRef.current = total;

  useEffect(() => {
    if (!EXIT_POPUP.enabled) return;
    if (get("local", SHOWN_KEY) || get("local", LEAD_SENT_KEY)) return;
    const started = Date.now();
    let fired = false;

    const fire = () => {
      if (fired || Date.now() - started < 8000) return;
      if (get("local", LEAD_SENT_KEY)) return;
      if (document.querySelector("dialog[open]")) return;
      const active = document.activeElement;
      if (active && active.closest("form")) return; // they're filling something in
      fired = true;
      try {
        localStorage.setItem(SHOWN_KEY, "1");
      } catch {
        /* ignore */
      }
      const priced = get("session", PRICED_KEY) && totalRef.current > 0;
      openQuickLead(priced ? "price" : EXIT_POPUP.offer === "guide" ? "guide" : "quick", {
        exit: true,
      });
      cleanup();
    };

    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget && e.clientY <= 0) fire();
    };
    let lastY = window.scrollY;
    let lastT = Date.now();
    const onScroll = () => {
      const y = window.scrollY;
      const t = Date.now();
      if (t - started > 40000 && lastY - y > 350 && t - lastT < 600 && lastY > 800) fire();
      if (t - lastT > 600 || y > lastY) {
        lastY = y;
        lastT = t;
      }
    };
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse) window.addEventListener("scroll", onScroll, { passive: true });
    else document.addEventListener("mouseout", onMouseOut);
    function cleanup() {
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("scroll", onScroll);
    }
    return cleanup;
  }, []);

  return null;
}
