/*
 * Server-side check that a request comes from a signed-in team member.
 * Used by every admin server function (Square, emails) so the public can't call them.
 * On the server, Lovable Cloud provides SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY (runtime values);
 * the VITE_ copies are a fallback for local development.
 */
function config() {
  const env = import.meta.env as Record<string, string | undefined>;
  const url = (process.env["SUPABASE_URL"] || env["VITE_SUPABASE_URL"] || "").replace(/\/+$/, "");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || env["VITE_SUPABASE_PUBLISHABLE_KEY"] || "";
  return { url, key };
}

export async function requireTeam(token: string): Promise<{ userId: string; email: string }> {
  const { url, key } = config();
  if (!url || !key) throw new Error("Database not connected");
  if (!token) throw new Error("Not signed in");
  const headers = {
    apikey: key,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const u = await fetch(`${url}/auth/v1/user`, { headers });
  if (!u.ok) throw new Error("Not signed in");
  const user = (await u.json()) as { id: string; email: string };

  const r = await fetch(`${url}/rest/v1/rpc/is_team`, {
    method: "POST",
    headers,
    body: JSON.stringify({ _uid: user.id }),
  });
  if (!r.ok || (await r.json()) !== true) throw new Error("Not on the team");
  return { userId: user.id, email: user.email };
}
