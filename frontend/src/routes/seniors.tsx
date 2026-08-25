import { createFileRoute } from "@tanstack/react-router";
import { Download, Eye, Pencil, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SeniorFormDialog } from "@/components/SeniorFormDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BARANGAYS, type Senior } from "@/lib/osca-data";
import { getStoredUser } from "@/lib/api";
import { useSeniors } from "@/lib/use-seniors";

export const Route = createFileRoute("/seniors")({
  head: () => ({
    meta: [
      { title: "Senior Records — Bulan SeniorCare" },
      {
        name: "description",
        content:
          "Manage all registered senior citizens of Bulan: profiles, OSCA IDs, barangay, benefits, and eligibility status.",
      },
      { property: "og:title", content: "Senior Records — Bulan SeniorCare" },
      {
        property: "og:description",
        content: "Search, filter, and manage every registered senior citizen record in Bulan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SeniorRecords,
});

const STATUS_CLASS: Record<string, string> = {
  Active: "text-success",
  Pending: "text-gold-foreground",
  Inactive: "text-destructive",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function SeniorRecords() {
  const { seniors, totalCount, activeCount, updateSenior, deleteSenior } = useSeniors({ excludePending: true });
  const isHead = getStoredUser()?.role === "head";
  const [filter, setFilter] = useState<string>("Active");
  const [barangayFilter, setBarangayFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Senior | null>(null);
  const [viewing, setViewing] = useState<Senior | null>(null);
  const [deleting, setDeleting] = useState<Senior | null>(null);

  const filters = useMemo(
    () => [
      { key: "All", count: totalCount },
      { key: "Active", count: activeCount },
      { key: "Inactive", count: seniors.filter((s) => s.status === "Inactive").length },
    ],
    [seniors, totalCount, activeCount],
  );

  const rows = useMemo(
    () =>
      seniors
        .filter((s) => (filter === "All" ? true : s.status === filter))
        .filter((s) => (barangayFilter === "All" ? true : s.barangay === barangayFilter))
        .filter(
          (s) =>
            s.name.toLowerCase().includes(query.toLowerCase()) ||
            s.id.toLowerCase().includes(query.toLowerCase()),
        ),
    [seniors, filter, barangayFilter, query],
  );

  return (
    <AppShell
      title="Senior Record"
      subtitle="Manage all registered senior citizens"
      breadcrumb={["Dashboard", "Senior Records"]}
      actions={
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 rounded-full bg-card px-6 py-3.5 text-sm font-semibold shadow-[var(--shadow-soft)]">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={
              filter === f.key
                ? "bg-navy rounded-full px-6 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-soft)]"
                : "rounded-full bg-card px-6 py-3 text-sm font-semibold text-muted-foreground shadow-[var(--shadow-soft)]"
            }
          >
            {f.key} <span className="ml-1 opacity-70">{f.count}</span>
          </button>
        ))}
        <select
          value={barangayFilter}
          onChange={(event) => setBarangayFilter(event.target.value)}
          aria-label="Filter by barangay"
          className="h-12 min-w-[240px] rounded-full bg-card px-5 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)] outline-none focus:ring-2 focus:ring-ring/30"
        >
          <option value="All">All barangays</option>
          {BARANGAYS.map((barangay) => (
            <option key={barangay} value={barangay}>
              {barangay}
            </option>
          ))}
        </select>
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or OSCA ID..."
            className="h-12 w-full rounded-full bg-card pr-4 pl-11 text-sm shadow-[var(--shadow-soft)] outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      <div className="surface-card mt-6 overflow-x-auto p-2">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              {["Name", "Senior ID", "Age", "Barangay", "Contact", "Benefit", "Status", "Actions"].map(
                (h) => (
                  <th key={h} className="px-5 py-5 font-bold text-foreground">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-navy grid h-9 w-9 place-items-center rounded-full text-[11px] font-bold text-primary-foreground">
                      {initials(s.name)}
                    </span>
                    <span className="font-medium">{s.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-muted-foreground">{s.id}</td>
                <td className="px-5 py-4">{s.age}</td>
                <td className="px-5 py-4 text-muted-foreground">{s.barangay}</td>
                <td className="px-5 py-4 text-muted-foreground">{s.contact}</td>
                <td className="px-5 py-4">{s.benefit}</td>
                <td className={`px-5 py-4 font-bold ${STATUS_CLASS[s.status]}`}>{s.status}</td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    <button
                      aria-label={`View record of ${s.name}`}
                      onClick={() => setViewing(s)}
                      className="grid h-9 w-9 place-items-center rounded-full bg-secondary transition-colors hover:bg-muted"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {!isHead && (
                      <>
                        <button
                          aria-label={`Edit record of ${s.name}`}
                          onClick={() => {
                            setEditing(s);
                            setFormOpen(true);
                          }}
                          className="grid h-9 w-9 place-items-center rounded-full bg-secondary transition-colors hover:bg-muted"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          aria-label={`Delete record of ${s.name}`}
                          onClick={() => setDeleting(s)}
                          className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-destructive transition-colors hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                  No records match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!isHead && (
        <SeniorFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          senior={editing}
          onSubmit={(draft) => {
            if (editing) {
              updateSenior(editing.id, draft);
              toast.success(`${draft.name}'s record was updated.`);
            }
          }}
        />
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{viewing?.name}</DialogTitle>
            <DialogDescription>OSCA ID {viewing?.id}</DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            {[
              ["Age", viewing?.age],
              ["Barangay", viewing?.barangay],
              ["Contact", viewing?.contact],
              ["Benefit", viewing?.benefit],
              ["Status", viewing?.status],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this senior record?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name} ({deleting?.id}) will be removed from the OSCA registry. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return;
                deleteSenior(deleting.id);
                toast.success(`${deleting.name}'s record was deleted.`);
                setDeleting(null);
              }}
            >
              Delete record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
