import { useMemo, useState, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Empty, Field, PageHeader, Panel, StatusPill, ago } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fetchCustomers } from "@/lib/admin-data";
import { dbOrThrow } from "@/lib/db";

export const Route = createFileRoute("/admin/customers/")({ component: Customers });

function Customers() {
  const customers = useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return customers.data ?? [];
    return (customers.data ?? []).filter((c) =>
      [c.name, c.company, c.phone, c.email, c.source, ...(c.tags ?? [])].some((v) =>
        v?.toLowerCase().includes(t),
      ),
    );
  }, [customers.data, q]);

  const add = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const phone = String(f.get("phone") || "");
    let digits = phone.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
    const { data, error } = await dbOrThrow()
      .from("customers")
      .insert({
        name: String(f.get("name") || "").trim(),
        company: String(f.get("company") || "").trim() || null,
        phone: phone || null,
        phone_digits: digits.length === 10 ? digits : null,
        email: String(f.get("email") || "").trim() || null,
        source: String(f.get("source") || "").trim() || "added manually",
        sourced_by: String(f.get("sourced_by") || "owner"),
      })
      .select("id")
      .single();
    if (error) {
      toast.error(
        error.message.includes("duplicate")
          ? "A customer with this phone already exists."
          : error.message,
      );
      return;
    }
    setAdding(false);
    void navigate({ to: "/admin/customers/$id", params: { id: (data as { id: string }).id } });
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        sub={`${customers.data?.length ?? 0} people and businesses`}
        actions={<Button onClick={() => setAdding(true)}>Add customer</Button>}
      />
      <Input
        placeholder="Search name, phone, email, tag…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mb-4 w-72"
      />
      <Panel className="p-0">
        {list.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="p-3">Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Stage</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-3">
                      <Link
                        to="/admin/customers/$id"
                        params={{ id: c.id }}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {c.name}
                      </Link>
                      {c.company && (
                        <div className="text-xs text-muted-foreground">{c.company}</div>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">{c.phone}</td>
                    <td className="p-3">
                      <StatusPill value={c.stage} />
                    </td>
                    <td className="p-3 max-w-48 truncate text-muted-foreground">{c.source}</td>
                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {ago(c.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <Empty>
              {customers.isLoading
                ? "Loading…"
                : "No customers yet. They appear automatically when someone books on the site."}
            </Empty>
          </div>
        )}
      </Panel>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={add} className="grid gap-3">
            <Field label="Name">
              <Input name="name" required />
            </Field>
            <Field label="Company (optional)">
              <Input name="company" />
            </Field>
            <Field label="Phone">
              <Input name="phone" type="tel" />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" />
            </Field>
            <Field label="How they found us">
              <Input name="source" placeholder="Referral, Nextdoor, door hanger…" />
            </Field>
            <Field label="Brought in by">
              <select
                name="sourced_by"
                className="h-9 rounded-md border bg-background px-3 text-sm"
                defaultValue="owner"
              >
                <option value="owner">Owner (his own customer)</option>
                <option value="partner">Partner (marketing)</option>
              </select>
            </Field>
            <Button type="submit">Add customer</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
