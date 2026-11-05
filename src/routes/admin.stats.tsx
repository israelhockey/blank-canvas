import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { BusinessStats } from "@/components/admin/BusinessStats";
import { Empty, PageHeader, Panel, Stat } from "@/components/admin/ui";
import { ANALYTICS } from "@/lib/analytics-config";
import { dbOrThrow } from "@/lib/db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/stats")({ component: Stats });

type StatsData = {
  visitors: number;
  pageviews: number;
  leads: number;
  by_day: { day: string; visitors: number; pageviews: number }[];
  events: { event: string; label: string; n: number }[];
  pages: { path: string; n: number }[];
  sources: { source: string; visitors: number }[];
  funnel: { visited: number; priced: number; started_booking: number; booked: number };
};

const RANGES = [
  { label: "Today", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

const EVENT_LABEL: Record<string, string> = {
  call_click: "Tapped Call",
  text_click: "Tapped Text",
  email_click: "Tapped Email",
  preset: "Picked a package",
  price_change: "Changed rooms/items",
  booking_start: "Started booking form",
  booking_submit: "Submitted a booking",
  walkthrough_submit: "Requested a walkthrough",
  nav_click: "Clicked a menu link",
  quote_view: "Opened a quote",
  quote_accept: "Accepted a quote",
  quick_lead_open: "Opened quick quote",
  quick_lead_submit: "Sent quick quote / saved price",
};

function Stats() {
  const [days, setDays] = useState(30);
  const { from, to } = useMemo(() => {
    const to = new Date(Date.now() + 60000);
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (days - 1));
    return { from, to };
  }, [days]);
  const stats = useQuery({
    queryKey: ["stats", days],
    queryFn: async () => {
      const { data, error } = await dbOrThrow().rpc("site_stats", {
        p_from: from.toISOString(),
        p_to: to.toISOString(),
      });
      if (error) throw new Error(error.message);
      return data as StatsData;
    },
  });
  const s = stats.data;
  const f = s?.funnel;
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stats"
        sub="Business results first, then website traffic. Admin visits and local testing aren't counted."
        actions={
          <div className="flex rounded-md border">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={cn(
                  "px-3 py-1.5 text-sm",
                  days === r.days && "bg-primary text-primary-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      <h2 className="pt-2 text-lg font-bold">Business</h2>
      <BusinessStats from={from} to={to} visitorsBySource={s?.sources ?? []} />

      <h2 className="pt-4 text-lg font-bold">Website traffic</h2>
      {!s ? (
        <Empty>{stats.isLoading ? "Loading…" : "No data yet."}</Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Visitors" value={s.visitors} />
            <Stat label="Page views" value={s.pageviews} />
            <Stat label="Leads" value={s.leads} hint="All forms" />
            <Stat label="Visitor → lead" value={pct(s.leads, s.visitors)} />
          </div>

          <Panel title="Visitors per day">
            {s.by_day.length ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={s.by_day} margin={{ left: -20, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="day"
                      tickFormatter={(d: string) =>
                        new Date(`${d}T12:00:00`).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                      fontSize={12}
                    />
                    <YAxis allowDecimals={false} fontSize={12} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="visitors"
                      name="Visitors"
                      stroke="#1650ec"
                      fill="#1650ec"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Empty>No visits in this range.</Empty>
            )}
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Booking funnel">
              {f && (
                <ol className="space-y-3">
                  {[
                    ["Visited the site", f.visited],
                    ["Used the price builder", f.priced],
                    ["Started the booking form", f.started_booking],
                    ["Submitted a booking", f.booked],
                  ].map(([label, n], i, arr) => (
                    <li key={String(label)}>
                      <div className="flex justify-between text-sm">
                        <span>{label}</span>
                        <span className="font-semibold tabular-nums">
                          {n}{" "}
                          {i > 0 && (
                            <span className="font-normal text-muted-foreground">
                              ({pct(Number(n), Number(arr[0]![1]))})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: f.visited ? `${(Number(n) / f.visited) * 100}%` : 0 }}
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>

            <Panel title="Where visitors came from">
              <BarList
                rows={s.sources.map((r) => ({ k: r.source, n: r.visitors }))}
                empty="No visits yet."
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Tag post links like <code>?utm_source=keller-moms-group</code> to see each group
                here.
              </p>
            </Panel>

            <Panel title="What people clicked">
              <BarList
                rows={s.events.map((e) => ({
                  k: `${EVENT_LABEL[e.event] ?? e.event}${e.label ? ` · ${e.label}` : ""}`,
                  n: e.n,
                }))}
                empty="No clicks yet."
              />
            </Panel>

            <Panel title="Top pages">
              <BarList
                rows={s.pages.map((p) => ({ k: p.path, n: p.n }))}
                empty="No page views yet."
              />
            </Panel>
          </div>

          <Panel title="More detail">
            <ul className="space-y-1 text-sm">
              <li>
                Google Analytics:{" "}
                {ANALYTICS.ga4 ? (
                  <a
                    className="underline"
                    href="https://analytics.google.com/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    open
                  </a>
                ) : (
                  <span className="text-muted-foreground">
                    not set up (add the ID in src/lib/analytics-config.ts)
                  </span>
                )}
              </li>
              <li>
                Microsoft Clarity heatmaps and recordings:{" "}
                {ANALYTICS.clarity ? (
                  <a
                    className="underline"
                    href={`https://clarity.microsoft.com/projects/view/${ANALYTICS.clarity}/dashboard`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    open
                  </a>
                ) : (
                  <span className="text-muted-foreground">not set up</span>
                )}
              </li>
              <li>
                Meta Pixel:{" "}
                {ANALYTICS.metaPixel ? (
                  <a
                    className="underline"
                    href="https://business.facebook.com/events_manager2"
                    target="_blank"
                    rel="noreferrer"
                  >
                    open Events Manager
                  </a>
                ) : (
                  <span className="text-muted-foreground">not set up</span>
                )}
              </li>
            </ul>
          </Panel>
        </>
      )}
    </div>
  );
}

function BarList({ rows, empty }: { rows: { k: string; n: number }[]; empty: string }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  const max = Math.max(...rows.map((r) => r.n), 1);
  return (
    <ul className="space-y-1.5">
      {rows.slice(0, 15).map((r) => (
        <li key={r.k} className="relative overflow-hidden rounded-md text-sm">
          <div
            className="absolute inset-y-0 left-0 bg-primary/10"
            style={{ width: `${(r.n / max) * 100}%` }}
          />
          <div className="relative flex justify-between gap-3 px-2 py-1">
            <span className="truncate">{r.k}</span>
            <span className="font-semibold tabular-nums">{r.n}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
