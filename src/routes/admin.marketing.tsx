import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { toast } from "sonner";

import { sourceName } from "@/components/admin/BusinessStats";
import { Empty, Field, PageHeader, Panel, fmtDate, selectClass, usd } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveSetting, useRefresh, useSettings, type TrackingLink } from "@/lib/admin-data";
import { dbOrThrow } from "@/lib/db";
import { CAPTIONS, RESOURCES } from "@/lib/marketing-content";
import { CITIES, SITE_ORIGIN, cityParam } from "@/lib/site-data";

export const Route = createFileRoute("/admin/marketing")({ component: LinksPage });

const CHANNELS = [
  ["facebook-group", "Facebook group post"],
  ["facebook-page", "Our Facebook Page"],
  ["facebook-ad", "Facebook / Instagram ad"],
  ["instagram", "Instagram post or bio"],
  ["nextdoor", "Nextdoor"],
  ["google-business", "Google Business Profile"],
  ["flyer", "Printed flyer / door hanger (QR)"],
  ["text", "Text message"],
  ["other", "Somewhere else"],
] as const;

const DESTS: [string, string][] = [
  ["/", "Home page"],
  ["/#pricing", "Price builder"],
  ["/#commercial", "Commercial section"],
  ...CITIES.map((c) => [`/carpet-cleaning/${cityParam(c)}`, `${c.name} page`] as [string, string]),
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const shortUrl = (slug: string) => `${SITE_ORIGIN.replace(/^https:\/\//, "")}/go/${slug}`;
const fullUrl = (slug: string) => `${SITE_ORIGIN}/go/${slug}`;

type Perf = { visitors: number; leads: number; jobs: number; paid: number };

async function loadPerf(): Promise<Record<string, Perf>> {
  const c = dbOrThrow();
  const from = new Date(Date.now() - 365 * 86400000).toISOString();
  const to = new Date(Date.now() + 60000).toISOString();
  const [stats, leads, jobs, paid] = await Promise.all([
    c.rpc("site_stats", { p_from: from, p_to: to }),
    c.from("leads").select("source").gte("created_at", from).limit(10000),
    c
      .from("jobs")
      .select("status, customers(source)")
      .gte("created_at", from)
      .neq("status", "canceled")
      .limit(10000),
    c
      .from("invoices")
      .select("amount, customers(source)")
      .eq("status", "paid")
      .gte("paid_at", from)
      .limit(10000),
  ]);
  const out: Record<string, Perf> = {};
  const r = (k: string) => (out[k] ??= { visitors: 0, leads: 0, jobs: 0, paid: 0 });
  const s = stats.data as { sources?: { source: string; visitors: number }[] } | null;
  for (const v of s?.sources ?? []) r(sourceName(v.source)).visitors += Number(v.visitors);
  for (const l of (leads.data ?? []) as { source: string | null }[])
    r(sourceName(l.source)).leads++;
  for (const j of (jobs.data ?? []) as unknown as { customers: { source: string | null } | null }[])
    r(sourceName(j.customers?.source)).jobs++;
  for (const p of (paid.data ?? []) as unknown as {
    amount: number;
    customers: { source: string | null } | null;
  }[])
    r(sourceName(p.customers?.source)).paid += Number(p.amount);
  return out;
}

function LinksPage() {
  const settings = useSettings();
  const refresh = useRefresh();
  const perf = useQuery({ queryKey: ["link-perf"], queryFn: loadPerf });
  const links = settings.data?.tracking_links ?? [];

  const [name, setName] = useState("");
  const [channel, setChannel] = useState<string>("facebook-group");
  const [dest, setDest] = useState("/");
  const [capLink, setCapLink] = useState("");
  const slug = slugify(name);
  const taken = links.some((l) => l.slug === slug);

  const create = async () => {
    if (!slug) return;
    if (taken) {
      toast.error("You already have a link with that name. Add something to make it unique.");
      return;
    }
    const next: TrackingLink[] = [
      { slug, label: name.trim(), channel, dest, created_at: new Date().toISOString() },
      ...links,
    ];
    await saveSetting("tracking_links", next);
    await navigator.clipboard.writeText(fullUrl(slug)).catch(() => undefined);
    toast.success("Link made and copied. Paste it in your post.");
    setName("");
    void refresh();
  };

  const remove = async (s: string) => {
    await saveSetting(
      "tracking_links",
      links.filter((l) => l.slug !== s),
    );
    void refresh();
  };

  const qr = async (l: TrackingLink) => {
    const png = await QRCode.toDataURL(fullUrl(l.slug), {
      width: 1024,
      margin: 2,
      color: { dark: "#0f1f38", light: "#ffffff" },
    });
    const a = document.createElement("a");
    a.href = png;
    a.download = `qr-${l.slug}.png`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Marketing"
        sub="Make one link per place you post. Every visit, lead and paid job from it is counted below and on Stats."
      />

      <Panel title="1. Make a link for each place you post">
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-end">
          <Field label="Where are you posting it?">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Keller Moms group"
              onKeyDown={(e) => e.key === "Enter" && void create()}
            />
          </Field>
          <Field label="Type">
            <select
              className={selectClass}
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              {CHANNELS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Send people to">
            <select className={selectClass} value={dest} onChange={(e) => setDest(e.target.value)}>
              {DESTS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Button disabled={!slug} onClick={() => void create()}>
            Make link
          </Button>
        </div>
        {slug && (
          <p className="mt-2 text-sm text-muted-foreground">
            Your link: <b className="text-foreground">{shortUrl(slug)}</b>
            {taken && <span className="ml-2 text-red-600">already used</span>}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Tip: for Facebook groups, use the group's name so you can see which groups pay off. For
          printed flyers, make a link and download its QR code.
        </p>
      </Panel>

      <Panel title={`Your links and what they brought in (${links.length})`}>
        {links.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="p-3">Link</th>
                  <th className="p-3 text-right">Visitors</th>
                  <th className="p-3 text-right">Leads</th>
                  <th className="p-3 text-right">Jobs</th>
                  <th className="p-3 text-right">Paid</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {links.map((l) => {
                  const p = perf.data?.[l.slug];
                  return (
                    <tr key={l.slug} className="border-b align-top last:border-0">
                      <td className="p-3">
                        <div className="font-medium">{l.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {CHANNELS.find(([v]) => v === l.channel)?.[1] ?? l.channel} ·{" "}
                          {DESTS.find(([v]) => v === l.dest)?.[1] ?? "Home page"} · made{" "}
                          {fmtDate(l.created_at)}
                        </div>
                        <div className="mt-1 font-mono text-xs">{shortUrl(l.slug)}</div>
                      </td>
                      <td className="p-3 text-right tabular-nums">{p?.visitors ?? 0}</td>
                      <td className="p-3 text-right tabular-nums">{p?.leads ?? 0}</td>
                      <td className="p-3 text-right tabular-nums">{p?.jobs ?? 0}</td>
                      <td className="p-3 text-right font-semibold tabular-nums">
                        {usd(p?.paid ?? 0, 0)}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={() =>
                              void navigator.clipboard
                                .writeText(fullUrl(l.slug))
                                .then(() => toast.success("Copied"))
                            }
                          >
                            Copy
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void qr(l)}>
                            QR code
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground"
                            onClick={() => void remove(l.slug)}
                          >
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <Empty>No links yet. Make one for each group or page you post in.</Empty>
          </div>
        )}
      </Panel>

      <Panel
        title="Captions to copy"
        actions={
          <select
            className={`${selectClass} w-56`}
            value={capLink}
            onChange={(e) => setCapLink(e.target.value)}
            aria-label="Link to put in the captions"
          >
            <option value="">Pick a link to fill in…</option>
            {links.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.label}
              </option>
            ))}
          </select>
        }
      >
        <p className="mb-3 text-sm text-muted-foreground">
          Pick the group's link at the top right, then tap Copy: it puts that link where the caption
          says [POST LINK]. Flyer codes (A1, A2…) match the designs.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {CAPTIONS.map((c) => {
            const text = capLink ? c.text.replaceAll("[POST LINK]", fullUrl(capLink)) : c.text;
            return (
              <div key={c.id} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">
                    {c.id !== "share" && (
                      <span className="mr-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                        {c.id}
                      </span>
                    )}
                    {c.title}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(text)
                        .then(() => toast.success("Caption copied"))
                    }
                  >
                    Copy
                  </Button>
                </div>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{text}</p>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Marketing tools">
        <ul className="grid gap-3 sm:grid-cols-2">
          {RESOURCES.map((r) => (
            <li key={r.href} className="rounded-lg border p-3 text-sm">
              <a href={r.href} target="_blank" rel="noreferrer" className="font-semibold underline">
                {r.label}
              </a>
              <p className="mt-1 text-muted-foreground">{r.note}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
