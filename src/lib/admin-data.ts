import { useQuery, useQueryClient } from "@tanstack/react-query";

import { dbOrThrow } from "./db";
import type {
  Activity,
  CommissionRule,
  Customer,
  Job,
  Lead,
  LineItem,
  Quote,
  Stage,
} from "./db-types";
import { TAX } from "./site-data";

/* Data helpers shared by the admin screens. All run with the signed-in user's session (RLS: team only). */

export const qk = {
  leads: ["leads"] as const,
  customers: ["customers"] as const,
  customer: (id: string) => ["customer", id] as const,
  jobs: (from: string, to: string) => ["jobs", from, to] as const,
  quotes: ["quotes"] as const,
  quote: (id: string) => ["quote", id] as const,
  tasks: ["tasks"] as const,
  settings: ["settings"] as const,
};

/** Refresh every admin list after a change. */
export function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

async function rows<T>(
  p: PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

export const fetchLeads = () =>
  rows<Lead[]>(
    dbOrThrow().from("leads").select("*").order("created_at", { ascending: false }).limit(500),
  );

export const fetchCustomers = () =>
  rows<Customer[]>(
    dbOrThrow().from("customers").select("*").order("updated_at", { ascending: false }).limit(1000),
  );

export const fetchJobs = (from: string, to: string) =>
  rows<Job[]>(
    dbOrThrow()
      .from("jobs")
      .select("*, customers(id,name,phone,email)")
      .gte("scheduled_date", from)
      .lte("scheduled_date", to)
      .order("scheduled_date"),
  );

export const fetchUnscheduledJobs = () =>
  rows<Job[]>(
    dbOrThrow()
      .from("jobs")
      .select("*, customers(id,name,phone,email)")
      .is("scheduled_date", null)
      .neq("status", "canceled")
      .order("created_at", { ascending: false }),
  );

export const fetchQuotes = () =>
  rows<Quote[]>(
    dbOrThrow()
      .from("quotes")
      .select("*, customers(id,name,phone,email)")
      .order("created_at", { ascending: false })
      .limit(500),
  );

export async function logActivity(a: Partial<Activity> & { kind: Activity["kind"] }) {
  const c = dbOrThrow();
  const { data } = await c.auth.getUser();
  await rows(c.from("activities").insert({ ...a, created_by: data.user?.id ?? null }));
}

export async function setCustomerStage(customerId: string, stage: Stage) {
  await rows(
    dbOrThrow()
      .from("customers")
      .update({ stage, updated_at: new Date().toISOString() })
      .eq("id", customerId),
  );
  await logActivity({ customer_id: customerId, kind: "status", body: `Stage → ${stage}` });
}

export function sumItems(items: LineItem[]) {
  const subtotal = Math.round(items.reduce((s, i) => s + (Number(i.amount) || 0), 0) * 100) / 100;
  const tax = Math.round(subtotal * TAX * 100) / 100;
  return { subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100 };
}

/* ---------- settings ---------- */

export type Settings = {
  commission: CommissionRule;
  review_link: string;
  repeat_months: number;
};

const DEFAULTS: Settings = {
  commission: { type: "percent", value: 20 },
  review_link: "",
  repeat_months: 6,
};

export async function fetchSettings(): Promise<Settings> {
  const data = await rows<{ key: string; value: unknown }[]>(
    dbOrThrow().from("settings").select("key,value"),
  );
  const s: Record<string, unknown> = { ...DEFAULTS };
  for (const r of data) s[r.key] = r.value;
  return s as Settings;
}

export async function saveSetting(key: keyof Settings, value: unknown) {
  await rows(
    dbOrThrow().from("settings").upsert({ key, value, updated_at: new Date().toISOString() }),
  );
}

export function useSettings() {
  return useQuery({ queryKey: qk.settings, queryFn: fetchSettings });
}

/** Partner cut for a job under the current rule (pre-tax amount). */
export function commissionFor(
  job: Pick<Job, "final_total" | "subtotal" | "tax" | "sourced_by">,
  rule: CommissionRule,
) {
  if (job.sourced_by !== "partner") return 0;
  const preTax =
    job.final_total != null ? Number(job.final_total) / (1 + TAX) : Number(job.subtotal);
  const v = rule.type === "percent" ? (preTax * rule.value) / 100 : rule.value;
  return Math.round(v * 100) / 100;
}

/** Upsert the commission row when a job is completed. */
export async function recordCommission(job: Job, rule: CommissionRule) {
  const amount = commissionFor(job, rule);
  if (job.sourced_by !== "partner") return;
  await rows(
    dbOrThrow()
      .from("commissions")
      .upsert(
        {
          job_id: job.id,
          amount,
          basis:
            rule.type === "percent" ? `${rule.value}% of pre-tax job value` : `Flat $${rule.value}`,
        },
        { onConflict: "job_id" },
      ),
  );
}
