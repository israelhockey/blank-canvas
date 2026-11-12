import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { dbOrThrow } from "@/lib/db";
import { saveSetting } from "@/lib/admin-data";

/** Subscribe to the existing read-only feed, without Google API credentials. */
export function GoogleCalendarConnection({ loading, onChange }: { loading: boolean; onChange: () => unknown }) {
  const [busy, setBusy] = useState(false);
  const sync = async () => {
    const popup = window.open("about:blank", "simple-surface-calendar");
    if (!popup) {
      toast.error("Allow popups, then try Sync Google Calendar again.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await dbOrThrow().from("settings").select("value").eq("key", "calendar_token").maybeSingle();
      if (error) throw error;
      let token = typeof data?.value === "string" ? data.value : "";
      if (!token) {
        token = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
        await saveSetting("calendar_token", token);
      }
      const feed = `webcal://simplesurfacecarpetcleaning.com/calendar-feed/${token}.ics`;
      popup.opener = null;
      popup.location.href = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feed)}`;
      void onChange();
      toast.message("Google Calendar opened. Confirm Add to finish.");
    } catch (error) {
      popup.close();
      toast.error(error instanceof Error ? error.message : "Could not open Google Calendar.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-labelledby="google-calendar-title" className="space-y-3 border-b pb-5">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-5 text-muted-foreground" aria-hidden="true" />
        <h2 id="google-calendar-title" className="text-lg font-semibold">Google Calendar</h2>
      </div>
      <Button disabled={busy || loading} onClick={() => void sync()}><CalendarDays className="size-4" />{busy ? "Opening…" : "Sync Google Calendar"}</Button>
      <p className="max-w-xl text-sm text-muted-foreground">Read-only job calendar · Google refreshes can take several hours.</p>
    </section>
  );
}