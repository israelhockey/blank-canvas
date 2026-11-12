import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Consent stays unavailable until a Google Calendar OAuth client is linked. */
export function GoogleCalendarConnection() {
  return (
    <section aria-labelledby="google-calendar-title" className="space-y-3 border-b pb-5">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-5 text-muted-foreground" aria-hidden="true" />
        <h2 id="google-calendar-title" className="text-lg font-semibold">Google Calendar</h2>
      </div>
      <p className="text-sm text-muted-foreground">Not connected · Google setup required</p>
      <Button disabled aria-describedby="google-calendar-setup">Connect Google Calendar</Button>
      <p id="google-calendar-setup" className="max-w-xl text-sm text-muted-foreground">
        The Google connection must be set up in Lovable before the owner can connect his account here.
      </p>
    </section>
  );
}