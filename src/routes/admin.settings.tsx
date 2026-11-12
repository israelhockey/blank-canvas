import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Field, PageHeader, Panel, selectClass } from "@/components/admin/ui";
import { GoogleCalendarConnection } from "@/components/admin/GoogleCalendarConnection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendTestEmail, squareStatus } from "@/lib/admin.functions";
import { saveSetting, useRefresh, useSettings, type AutomationSettings } from "@/lib/admin-data";
import { accessToken, dbOrThrow } from "@/lib/db";
import type { CommissionRule, TeamInvite, TeamMember } from "@/lib/db-types";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Business settings | Simple Surface" },
      { name: "description", content: "Manage Simple Surface team, calendar connections and business settings." },
      { property: "og:title", content: "Business settings | Simple Surface" },
      { property: "og:description", content: "Manage Simple Surface team, calendar connections and business settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const settings = useSettings();
  const refresh = useRefresh();
  const sq = useServerFn(squareStatus);
  const testEmail = useServerFn(sendTestEmail);
  const [testing, setTesting] = useState(false);

  const [rule, setRule] = useState<CommissionRule>({ type: "percent", value: 20 });
  const [review, setReview] = useState("");
  const [months, setMonths] = useState(6);
  const [auto, setAuto] = useState<AutomationSettings>({
    reminders: true,
    quote_followup: true,
    review: true,
  });
  useEffect(() => {
    if (!settings.data) return;
    setAuto(settings.data.automations);
    setRule(settings.data.commission);
    setReview(settings.data.review_link);
    setMonths(Number(settings.data.repeat_months) || 6);
  }, [settings.data]);

  const team = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const c = dbOrThrow();
      const [m, i] = await Promise.all([
        c.from("team_members").select("*"),
        c.from("team_invites").select("*"),
      ]);
      return { members: (m.data ?? []) as TeamMember[], invites: (i.data ?? []) as TeamInvite[] };
    },
  });
  const square = useQuery({
    queryKey: ["square-status"],
    queryFn: async () => sq({ data: { auth: await accessToken() } }),
    retry: false,
  });

  const [invite, setInvite] = useState({
    email: "",
    role: "owner" as TeamInvite["role"],
    name: "",
  });

  const saveAll = async () => {
    try {
      await saveSetting("commission", { ...rule, value: Number(rule.value) || 0 });
      await saveSetting("review_link", review.trim());
      await saveSetting("repeat_months", months);
      await saveSetting("automations", auto);
      toast.success("Settings saved");
      void refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" />
      <GoogleCalendarConnection loading={settings.isLoading} onChange={refresh} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Partner commission">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type">
              <select
                className={selectClass}
                value={rule.type}
                onChange={(e) =>
                  setRule({ ...rule, type: e.target.value as CommissionRule["type"] })
                }
              >
                <option value="percent">Percent of pre-tax job value</option>
                <option value="flat">Flat amount per job</option>
              </select>
            </Field>
            <Field label={rule.type === "percent" ? "Percent" : "Dollars per job"}>
              <Input
                inputMode="decimal"
                value={String(rule.value)}
                onChange={(e) =>
                  setRule({ ...rule, value: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })
                }
              />
            </Field>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Applies to completed jobs marked "brought in by partner". Changing it doesn't change
            commissions already recorded.
          </p>
        </Panel>

        <Panel title="Customer messages">
          <div className="grid gap-3">
            <Field label="Google review link">
              <Input
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="https://g.page/r/…/review"
              />
            </Field>
            <Field label="Repeat-clean reminder after (months)">
              <Input
                type="number"
                min={1}
                max={24}
                value={months}
                onChange={(e) => setMonths(Number(e.target.value) || 6)}
                className="w-32"
              />
            </Field>
            <div className="flex items-center gap-3 border-t pt-3">
              <Button
                variant="outline"
                disabled={testing}
                onClick={async () => {
                  setTesting(true);
                  const r = await testEmail({ data: { auth: await accessToken() } }).catch(
                    (e: Error) => ({ ok: false as const, error: e.message }),
                  );
                  setTesting(false);
                  if (r.ok) toast.success(`Test email sent to ${r.to}`);
                  else toast.error(r.error, { duration: 15000 });
                }}
              >
                {testing ? "Sending…" : "Send me a test email"}
              </Button>
              <span className="text-xs text-muted-foreground">Checks that email is set up.</span>
            </div>
          </div>
        </Panel>
        <Panel title="Automatic emails">
          <p className="mb-3 text-sm text-muted-foreground">
            Sent on their own, once each, and saved to the customer's email history. Customers
            marked "do not contact" are skipped.
          </p>
          <div className="space-y-2.5 text-sm">
            {(
              [
                ["reminders", "Day-before reminder", "Confirmed jobs, sent the afternoon before."],
                [
                  "quote_followup",
                  "Quote follow-up",
                  "If a quote hasn't been accepted after 2 days.",
                ],
                [
                  "review",
                  "Google review request",
                  "The day after a job is paid. Needs the review link above.",
                ],
              ] as const
            ).map(([k, label, hint]) => (
              <label key={k} className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={auto[k]}
                  onChange={(e) => setAuto({ ...auto, [k]: e.target.checked })}
                />
                <span>
                  <span className="font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </Panel>
        <CalendarFeed token={settings.data?.calendar_token ?? ""} onChange={refresh} />
      </div>
      <Button onClick={() => void saveAll()}>Save settings</Button>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Square">
          {square.isLoading ? (
            <p className="text-sm text-muted-foreground">Checking…</p>
          ) : square.data?.connected ? (
            <p className="text-sm">
              Connected{square.data.location ? ` · ${square.data.location}` : ""}. Invoices go out
              from his Square account.
            </p>
          ) : (
            <div className="space-y-2 text-sm">
              <p>Not connected yet.</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>
                  He signs in at developer.squareup.com with his Square login and creates an app.
                </li>
                <li>
                  In the app, open Credentials, switch to Production and copy the access token.
                </li>
                <li>In Lovable → Settings → Secrets, add SQUARE_ACCESS_TOKEN with that value.</li>
              </ol>
              {square.data && "error" in square.data && square.data.error && (
                <p className="text-red-600">{square.data.error}</p>
              )}
            </div>
          )}
        </Panel>

        <Panel title="Team">
          <ul className="mb-3 space-y-1 text-sm">
            {(team.data?.members ?? []).map((m) => (
              <li key={m.user_id} className="flex justify-between">
                <span>{m.display_name || m.email}</span>
                <span className="capitalize text-muted-foreground">{m.role} · active</span>
              </li>
            ))}
            {(team.data?.invites ?? [])
              .filter(
                (i) =>
                  !(team.data?.members ?? []).some(
                    (m) => m.email.toLowerCase() === i.email.toLowerCase(),
                  ),
              )
              .map((i) => (
                <li key={i.email} className="flex justify-between">
                  <span>{i.display_name || i.email}</span>
                  <span className="capitalize text-muted-foreground">{i.role} · invited</span>
                </li>
              ))}
          </ul>
          <div className="grid gap-2 sm:grid-cols-[1fr_110px_auto]">
            <Input
              placeholder="email@example.com"
              value={invite.email}
              onChange={(e) => setInvite({ ...invite, email: e.target.value })}
            />
            <select
              className={selectClass}
              value={invite.role}
              onChange={(e) => setInvite({ ...invite, role: e.target.value as TeamInvite["role"] })}
            >
              <option value="owner">Owner</option>
              <option value="partner">Partner</option>
            </select>
            <Button
              variant="outline"
              disabled={!invite.email.includes("@")}
              onClick={async () => {
                const { error } = await dbOrThrow()
                  .from("team_invites")
                  .upsert({
                    email: invite.email.trim().toLowerCase(),
                    role: invite.role,
                    display_name: invite.name || null,
                  });
                if (error) {
                  toast.error(error.message);
                  return;
                }
                toast.success("Invited. They create a login at /admin with this email.");
                setInvite({ email: "", role: "owner", name: "" });
                void team.refetch();
              }}
            >
              Invite
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/** Private calendar link: every booked job shows up in Google Calendar or the iPhone Calendar. */
function CalendarFeed({ token, onChange }: { token: string; onChange: () => unknown }) {
  const url = token ? `https://simplesurfacecarpetcleaning.com/calendar-feed/${token}.ics` : "";
  const webcal = url.replace(/^https:/, "webcal:");
  const create = async () => {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const t = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    await saveSetting("calendar_token", t);
    toast.success(token ? "New link made. The old one stopped working." : "Calendar link ready");
    void onChange();
  };
  return (
    <Panel title="Jobs on your phone's calendar">
      {url ? (
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Add this once and every booked job appears on your calendar with the customer, address,
            phone and price. It updates on its own (Google can take a few hours).
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <a href={webcal}>Add to iPhone / Mac Calendar</a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a
                href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`}
                target="_blank"
                rel="noreferrer"
              >
                Add to Google Calendar
              </a>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void navigator.clipboard.writeText(url).then(() => toast.success("Link copied"))
              }
            >
              Copy link
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Keep this link private: anyone with it can see your schedule.{" "}
            <button className="underline" onClick={() => void create()}>
              Make a new link
            </button>{" "}
            if it was shared by mistake.
          </p>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Get a private link that puts every booked job on his phone's calendar automatically.
          </p>
          <Button size="sm" onClick={() => void create()}>
            Create calendar link
          </Button>
        </div>
      )}
    </Panel>
  );
}
