import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Megaphone, MessageCircle, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { AnnouncementDialog } from "@/components/AnnouncementDialog";
import { AppShell } from "@/components/AppShell";
import { AuthAlert } from "@/components/AuthLayout";
import { EmptyState, SectionHeader, TileSkeletons } from "@/components/DesignKit";
import { badgeClass, fieldClass, panelClass, tileClass } from "@/components/design-kit";
import { announcementImageUrl } from "@/lib/announcements";
import { getAnnouncements, type Announcement } from "@/lib/api";

export const Route = createFileRoute("/announcements")({
  head: () => ({ meta: [{ title: "Announcements — Bulan SeniorCare" }] }),
  component: AnnouncementsPage,
});

function commentCount(announcement: Announcement) {
  return (announcement.comments ?? []).reduce(
    (total, comment) => total + 1 + (comment.replies?.length ?? 0),
    0,
  );
}

function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Announcement | null>(null);

  useEffect(() => {
    getAnnouncements()
      .then(setAnnouncements)
      .catch((loadError: unknown) =>
        setError(loadError instanceof Error ? loadError.message : "Could not load announcements."),
      )
      .finally(() => setLoading(false));
  }, []);

  // A link such as /announcements#announcement-12 opens that announcement.
  useEffect(() => {
    const openFromHash = () => {
      const match = window.location.hash.match(/^#announcement-(\d+)$/);
      const announcement = match
        ? announcements.find((item) => item.id === Number(match[1]))
        : undefined;
      if (announcement) setSelected(announcement);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [announcements]);

  const query = search.trim().toLowerCase();
  const visible = query
    ? announcements.filter((announcement) =>
        `${announcement.title} ${announcement.message}`.toLowerCase().includes(query),
      )
    : announcements;

  return (
    <AppShell
      title="Announcements"
      subtitle="Every announcement from OSCA Bulan, newest first"
      breadcrumb={["Dashboard", "Announcements"]}
    >
      <section className={`${panelClass} p-5 sm:p-7`}>
        <SectionHeader
          icon={Megaphone}
          title="All announcements"
          subtitle="Open an announcement to read it in full and join the conversation."
          badge={
            <span className={`${badgeClass} inline-flex items-center gap-1.5`}>
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              {loading ? "Loading..." : `${announcements.length} total`}
            </span>
          }
        />

        {announcements.length > 0 && (
          <div className="relative mt-5">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search announcements"
              aria-label="Search announcements"
              className={`${fieldClass} h-11 pl-10`}
            />
          </div>
        )}

        {error && (
          <div className="mt-6">
            <AuthAlert tone="error">{error}</AuthAlert>
          </div>
        )}

        <div className="mt-5 space-y-3">
          {loading && <TileSkeletons count={3} label="Loading announcements" />}
          {visible.map((announcement) => {
            const comments = commentCount(announcement);
            const hasImage = Boolean(announcement.image_path || announcement.source_image_url);
            return (
              <button
                key={announcement.id}
                type="button"
                id={`announcement-${announcement.id}`}
                onClick={() => setSelected(announcement)}
                className={`${tileClass} flex w-full gap-4 text-left transition-[border-color,box-shadow] hover:border-ring/40 hover:shadow-[var(--shadow-soft)] focus-visible:outline-2 focus-visible:outline-ring`}
              >
                {hasImage && (
                  <img
                    src={announcementImageUrl(announcement)}
                    alt=""
                    loading="lazy"
                    className="hidden h-24 w-24 shrink-0 rounded-md bg-muted object-cover sm:block"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{announcement.title}</span>
                  <span className="mt-1 line-clamp-3 block text-sm whitespace-pre-line text-muted-foreground">
                    {announcement.message}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{new Date(announcement.published_at).toLocaleDateString()}</span>
                    {comments > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {comments} {comments === 1 ? "comment" : "comments"}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {!loading && !error && announcements.length === 0 && (
          <EmptyState
            icon={Megaphone}
            title="No announcements yet"
            description="Announcements from the OSCA Head will appear here."
            className="mt-6"
          />
        )}
        {!loading && announcements.length > 0 && visible.length === 0 && (
          <EmptyState
            icon={Search}
            title="No matching announcements"
            description="Try a different word."
            className="mt-6"
          />
        )}
      </section>

      {selected && (
        <AnnouncementDialog
          announcement={selected}
          onClose={() => setSelected(null)}
          onChange={(updated) => {
            setSelected(updated);
            setAnnouncements((current) =>
              current.map((item) => (item.id === updated.id ? updated : item)),
            );
          }}
          onDeleted={(deleted) => {
            setAnnouncements((current) => current.filter((item) => item.id !== deleted.id));
            setSelected(null);
          }}
        />
      )}
    </AppShell>
  );
}
