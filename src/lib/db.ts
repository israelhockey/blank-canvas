import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

/*
 * Thin wrapper around Lovable Cloud's generated client, so every screen shares one login session.
 * Untyped on purpose: the admin code uses its own row types (src/lib/db-types.ts).
 */
const env = import.meta.env as Record<string, string | undefined>;
export const isDbConfigured = Boolean(
  env["VITE_SUPABASE_URL"] && env["VITE_SUPABASE_PUBLISHABLE_KEY"],
);

/** The shared client, or null when Lovable Cloud isn't connected. */
export function db(): SupabaseClient | null {
  return isDbConfigured ? (supabase as unknown as SupabaseClient) : null;
}

/** Same as db() but throws a readable error; use inside the admin area. */
export function dbOrThrow(): SupabaseClient {
  const c = db();
  if (!c) throw new Error("The database isn't connected yet. Turn on Lovable Cloud.");
  return c;
}

/** Access token of the signed-in team member, for calling protected server functions. */
export async function accessToken(): Promise<string> {
  const { data } = await dbOrThrow().auth.getSession();
  const t = data.session?.access_token;
  if (!t) throw new Error("Please sign in again.");
  return t;
}
