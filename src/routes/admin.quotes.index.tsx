import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Empty, PageHeader, Panel, StatusPill, fmtDate, usd } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { fetchQuotes } from "@/lib/admin-data";

export const Route = createFileRoute("/admin/quotes/")({ component: Quotes });

function Quotes() {
  const quotes = useQuery({ queryKey: ["quotes"], queryFn: fetchQuotes });
  const list = quotes.data ?? [];
  const open = list.filter((q) => ["sent", "viewed"].includes(q.status));
  const won = list.filter((q) => q.status === "accepted");

  return (
    <div>
      <PageHeader
        title="Quotes"
        sub={`${open.length} waiting on the customer · ${won.length} accepted (${usd(
          won.reduce((s, q) => s + Number(q.total), 0),
          0,
        )})`}
        actions={
          <Button asChild>
            <Link to="/admin/quotes/$id" params={{ id: "new" }} search={{ customer: undefined }}>
              New quote
            </Link>
          </Button>
        }
      />
      <Panel className="p-0">
        {list.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="p-3">#</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Title</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {list.map((q) => (
                  <tr key={q.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-3">
                      <Link
                        to="/admin/quotes/$id"
                        params={{ id: q.id }}
                        search={{ customer: undefined }}
                        className="font-medium underline"
                      >
                        {q.number}
                      </Link>
                    </td>
                    <td className="p-3">{q.customers?.name}</td>
                    <td className="p-3 max-w-64 truncate">{q.title}</td>
                    <td className="p-3 text-right tabular-nums">{usd(q.total)}</td>
                    <td className="p-3">
                      <StatusPill value={q.status} />
                    </td>
                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {fmtDate(q.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <Empty>
              {quotes.isLoading
                ? "Loading…"
                : "No quotes yet. Make one from a lead or customer page."}
            </Empty>
          </div>
        )}
      </Panel>
    </div>
  );
}
