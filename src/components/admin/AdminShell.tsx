import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import {
  BarChart3,
  CalendarDays,
  FileText,
  HandCoins,
  LayoutDashboard,
  Megaphone,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { db, isDbConfigured } from "@/lib/db";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", label: "Home", icon: LayoutDashboard, exact: true },
  { to: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/quotes", label: "Quotes", icon: FileText },
  { to: "/admin/stats", label: "Stats", icon: BarChart3 },
  { to: "/admin/marketing", label: "Marketing", icon: Megaphone },
  { to: "/admin/commission", label: "Commission", icon: HandCoins },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

type Access = "loading" | "signed_out" | "not_team" | "ok";

export function AdminShell({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [access, setAccess] = useState<Access>("loading");
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const c = db();
    if (!c) return;
    const check = async (s: Session | null) => {
      setSession(s);
      if (!s) return setAccess("signed_out");
      const { data } = await c.rpc("claim_team_access");
      setAccess(data === true ? "ok" : "not_team");
    };
    void c.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = c.auth.onAuthStateChange((_e, s) => void check(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => setOpen(false), [path]);

  if (!isDbConfigured) {
    return (
      <Centered>
        <h1 className="text-xl font-bold">Back office not connected yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Turn on Lovable Cloud and apply the database setup. This page comes alive automatically
          once it's connected.
        </p>
      </Centered>
    );
  }
  if (access === "loading")
    return (
      <Centered>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </Centered>
    );
  if (access === "signed_out") return <SignIn />;
  if (access === "not_team") {
    return (
      <Centered>
        <h1 className="text-xl font-bold">No access yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {session?.user.email} isn't on the team list. Ask the owner to add this email in Settings
          → Team, then sign in again.
        </p>
        <Button className="mt-4" variant="outline" onClick={() => void db()?.auth.signOut()}>
          Sign out
        </Button>
      </Centered>
    );
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => {
        const active =
          "exact" in n && n.exact ? path === n.to || path === `${n.to}/` : path.startsWith(n.to);
        const Icon = n.icon;
        return (
          <Link
            key={n.to}
            to={n.to}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-muted/40 text-foreground">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          aria-label="Open menu"
          onClick={() => setOpen(!open)}
          className="rounded-md p-1.5 hover:bg-muted"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <Brand />
      </header>
      {open && <div className="border-b bg-background p-3 lg:hidden">{nav}</div>}
      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r bg-background p-4 lg:flex">
          <Brand />
          {nav}
          <div className="mt-auto space-y-2 border-t pt-4 text-xs text-muted-foreground">
            <div className="truncate">{session?.user.email}</div>
            <div className="flex gap-2">
              <a href="/" target="_blank" rel="noreferrer" className="underline">
                View site
              </a>
              <button
                className="inline-flex items-center gap-1 underline"
                onClick={() => void db()?.auth.signOut()}
              >
                <LogOut className="size-3" /> Sign out
              </button>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
      <Toaster richColors position="top-center" />
    </div>
  );
}

function Brand() {
  return (
    <Link to="/admin" className="flex items-center gap-2">
      <img src="/brand/mark-192.png" alt="" className="size-8 rounded-md border bg-white p-0.5" />
      <span className="leading-tight">
        <span className="block text-sm font-extrabold uppercase tracking-wide">Simple Surface</span>
        <span className="block text-[11px] text-muted-foreground">Back office</span>
      </span>
    </Link>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function SignIn() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") || "").trim();
    const password = String(f.get("password") || "");
    const c = db();
    if (!c) return;
    setBusy(true);
    setMsg("");
    const res =
      mode === "in"
        ? await c.auth.signInWithPassword({ email, password })
        : await c.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/admin` },
          });
    setBusy(false);
    if (res.error) {
      setMsg(res.error.message);
      return;
    }
    if (mode === "up" && !res.data.session)
      setMsg("Check your email to confirm your account, then sign in.");
  };

  return (
    <Centered>
      <Brand />
      <h1 className="mt-5 text-xl font-bold">{mode === "in" ? "Sign in" : "Create your login"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === "in" ? "Team members only." : "Use the email you were invited with."}
      </p>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
        <Input name="email" type="email" placeholder="Email" autoComplete="email" required />
        <Input
          name="password"
          type="password"
          placeholder="Password"
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          minLength={8}
          required
        />
        <Button type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create login"}
        </Button>
      </form>
      {msg && <p className="mt-3 text-sm text-muted-foreground">{msg}</p>}
      <button
        className="mt-4 text-sm underline"
        onClick={() => setMode(mode === "in" ? "up" : "in")}
      >
        {mode === "in" ? "First time? Create your login" : "Already have a login? Sign in"}
      </button>
      {mode === "in" && (
        <button
          className="mt-2 block text-xs text-muted-foreground underline"
          onClick={async () => {
            const email = (
              document.querySelector<HTMLInputElement>('input[name="email"]')?.value || ""
            ).trim();
            if (!email) {
              setMsg("Enter your email above first.");
              return;
            }
            const { error } = await db()!.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/admin`,
            });
            setMsg(error ? error.message : "Password reset email sent.");
          }}
        >
          Forgot password?
        </button>
      )}
    </Centered>
  );
}
