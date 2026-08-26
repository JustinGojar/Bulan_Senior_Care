import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Clock, CornerUpLeft, ImagePlus, Megaphone, ShieldCheck, UserCheck, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  apiFetch,
  createAnnouncement,
  createAnnouncementComment,
  getAnnouncements,
  getStoredUser,
  type Announcement,
  type AnnouncementComment,
  type Overview,
} from "@/lib/api";
import { findNewEligibilityFlags } from "@/lib/osca-data";
import { useSeniors } from "@/lib/use-seniors";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "System Dashboard — Bulan SeniorCare" },
      {
        name: "description",
        content:
          "Overview of OSCA Bulan operations: registered seniors, benefits distributed, pending applications, and distribution status.",
      },
      { property: "og:title", content: "System Dashboard — Bulan SeniorCare" },
      {
        property: "og:description",
        content: "Live overview of senior citizen registrations and benefit distribution in Bulan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const TONES: Record<string, string> = {
  gold: "bg-gold",
  navy: "bg-navy",
  coral: "bg-coral",
};

function Dashboard() {
  const { seniors, totalCount, activeCount, pendingCount, loading } = useSeniors();
  const currentUser = getStoredUser();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [commentMessage, setCommentMessage] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [commentSaving, setCommentSaving] = useState(false);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementImage, setAnnouncementImage] = useState<File | null>(null);
  const [announcementImagePreview, setAnnouncementImagePreview] = useState<string | null>(null);
  const [announcementError, setAnnouncementError] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const eligibilityFlags = findNewEligibilityFlags(
    seniors.filter((senior) => senior.status !== "Pending"),
  );

  useEffect(() => {
    getAnnouncements().then((loadedAnnouncements) => {
      setAnnouncements(loadedAnnouncements);
      const match = window.location.hash.match(/^#announcement-(\d+)$/);
      const announcement = match
        ? loadedAnnouncements.find((item) => item.id === Number(match[1]))
        : undefined;
      if (announcement) setSelectedAnnouncement(announcement);
    }).catch(() => setAnnouncements([]));
  }, []);

  useEffect(() => {
    apiFetch<Overview>("/overview").then(setOverview).catch(() => setOverview(null));
  }, []);

  useEffect(() => {
    if (!announcementImage) {
      setAnnouncementImagePreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(announcementImage);
    setAnnouncementImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [announcementImage]);

  async function handleCreateAnnouncement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAnnouncementSaving(true);
    setAnnouncementError(null);
    try {
      const announcement = await createAnnouncement(announcementTitle, announcementMessage, announcementImage);
      setAnnouncements((current) => [announcement, ...current]);
      setAnnouncementTitle("");
      setAnnouncementMessage("");
      setAnnouncementImage(null);
      setShowAnnouncementForm(false);
    } catch (error) {
      setAnnouncementError(error instanceof Error ? error.message : "Unable to create announcement.");
    } finally {
      setAnnouncementSaving(false);
    }
  }

  async function handleCreateComment(event: React.FormEvent<HTMLFormElement>, parentCommentId?: number) {
    event.preventDefault();
    if (!selectedAnnouncement) return;
    const message = parentCommentId ? replyMessage : commentMessage;
    if (!message.trim()) return;
    setCommentSaving(true);
    try {
      const comment = await createAnnouncementComment(selectedAnnouncement.id, message.trim(), parentCommentId);
      const comments = parentCommentId
        ? (selectedAnnouncement.comments ?? []).map((item) => item.id === parentCommentId ? { ...item, replies: [...(item.replies ?? []), comment] } : item)
        : [...(selectedAnnouncement.comments ?? []), comment];
      setSelectedAnnouncement({ ...selectedAnnouncement, comments });
      setAnnouncements((current) => current.map((announcement) =>
        announcement.id === selectedAnnouncement.id ? { ...announcement, comments } : announcement,
      ));
      if (parentCommentId) {
        setReplyMessage("");
        setReplyTo(null);
      } else setCommentMessage("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send comment.");
    } finally {
      setCommentSaving(false);
    }
  }

  return (
    <AppShell
      title="System Dashboard"
      subtitle="Overview of OSCA Bulan operations and analytics"
      breadcrumb={["Dashboard"]}
    >
      {currentUser?.role === "head" && (
        <button
          type="button"
          onClick={() => setShowAnnouncementForm(true)}
          className="surface-card mb-6 flex w-full items-center gap-4 p-4 text-left transition-shadow hover:shadow-[var(--shadow-soft)]"
        >
          <div className="bg-navy grid h-11 w-11 shrink-0 place-items-center rounded-full text-primary-foreground">
            <Megaphone className="h-5 w-5" />
          </div>
          <span className="flex-1 text-sm text-muted-foreground">What is the announcement?</span>
        </button>
      )}

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <article className="surface-card p-6">
          <div className="flex items-start justify-between">
            <div className="bg-navy grid h-12 w-12 place-items-center rounded-2xl text-primary-foreground">
              <Users className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-[10px] font-bold tracking-wider text-muted-foreground">
              LIVE
            </span>
          </div>
          <p className="mt-6 text-sm font-semibold text-muted-foreground">Total Registered</p>
          <p className="font-display text-4xl font-extrabold">
            {loading ? "..." : totalCount.toLocaleString()}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">Current senior records</p>
        </article>

        <article className="surface-card p-6">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gold text-gold-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="mt-6 text-sm font-semibold text-muted-foreground">
            Total Benefits Distributed
          </p>
          <p className="font-display text-4xl font-extrabold">{overview ? overview.benefits_distributed_count.toLocaleString() : "..."}</p>
          <p className="mt-4 text-xs text-muted-foreground">Released benefit transactions</p>
        </article>

        <article className="surface-card p-6">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-success text-success-foreground">
            <UserCheck className="h-5 w-5" />
          </div>
          <p className="mt-6 text-sm font-semibold text-muted-foreground">Active Seniors</p>
          <p className="font-display text-4xl font-extrabold">
            {loading ? "..." : activeCount.toLocaleString()}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">Verified and receiving benefits</p>
        </article>

        <article className="surface-card p-6">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-coral text-coral-foreground">
            <Clock className="h-5 w-5" />
          </div>
          <p className="mt-6 text-sm font-semibold text-muted-foreground">Pending Applications</p>
          <p className="font-display text-4xl font-extrabold">
            {loading ? "..." : pendingCount.toLocaleString()}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">Awaiting eligibility verification</p>
        </article>
      </div>

      <div className={currentUser?.role === "admin" ? "mt-6 grid gap-6 lg:grid-cols-2" : "mt-6 space-y-6"}>
        {currentUser?.role === "head" && (
          <section className="surface-card p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Benefits received by age</h2>
                <p className="mt-1 text-sm text-muted-foreground">Live count of seniors who received each age-based benefit.</p>
              </div>
              <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success">
                {overview?.distribution_percentage ?? 0}% released
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(overview?.received_by_benefit ?? []).map((item) => (
                <div key={item.benefit} className="rounded-2xl bg-secondary p-4">
                  <p className="text-sm font-bold">{item.benefit}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Age {item.age_range}</p>
                  <p className="mt-3 text-2xl font-extrabold">{item.received_count}</p>
                  <p className="text-xs text-muted-foreground">seniors received</p>
                </div>
              ))}
              {overview && overview.received_by_benefit.length === 0 && (
                <p className="text-sm text-muted-foreground">No released benefits yet.</p>
              )}
            </div>
          </section>
        )}
        <section className="surface-card flex h-[430px] flex-col overflow-hidden p-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground">
                <Megaphone className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold">Announcements</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
                {announcements.length} total
              </span>
            </div>
          </div>
          <div className="mt-6 min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
            {announcements.slice(0, 5).map((announcement) => (
              <article
                key={announcement.id}
                id={`announcement-${announcement.id}`}
                onClick={() => setSelectedAnnouncement(announcement)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedAnnouncement(announcement);
                  }
                }}
                role="button"
                tabIndex={0}
                className="cursor-pointer rounded-2xl bg-secondary p-4 transition-shadow hover:shadow-[var(--shadow-soft)]"
              >
                {announcement.image_path && (
                  <img
                    src={`${import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ?? "http://127.0.0.1:8000"}/storage/${announcement.image_path}`}
                    alt=""
                    className="mb-3 max-h-96 w-full rounded-xl bg-card object-contain"
                  />
                )}
                <p className="text-sm font-bold">{announcement.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{announcement.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(announcement.published_at).toLocaleDateString()}
                </p>
              </article>
            ))}
            {!announcements.length && (
              <p className="text-sm text-muted-foreground">No current announcements.</p>
            )}
          </div>
        </section>

        <section className="surface-card h-[430px] overflow-hidden p-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground">
                <Clock className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold">Distribution Status</h2>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
              Live
            </span>
          </div>
          <div className="mt-7 space-y-5">
            {[
              { label: "Received", value: overview?.benefits_distributed_count ?? 0, color: "bg-success", text: "text-success" },
              { label: "Pending", value: overview?.benefits_pending_count ?? 0, color: "bg-gold", text: "text-gold-foreground" },
              { label: "Not received", value: overview?.benefits_failed_count ?? 0, color: "bg-coral", text: "text-coral" },
            ].map((item) => {
              const total = (overview?.benefits_distributed_count ?? 0) + (overview?.benefits_pending_count ?? 0) + (overview?.benefits_failed_count ?? 0);
              const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{item.label}</span>
                    <span className={`font-bold ${item.text}`}>{item.value}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-secondary">
                    <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
            {!overview && <p className="text-sm text-muted-foreground">Loading distribution data...</p>}
            {overview && (overview.benefits_distributed_count + overview.benefits_pending_count + overview.benefits_failed_count === 0) && (
              <p className="text-sm text-muted-foreground">No benefit transactions recorded yet.</p>
            )}
          </div>
        </section>
      </div>

      <section className="surface-card mt-6 p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gold text-gold-foreground">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Age Threshold Detection</h2>
              <p className="text-sm text-muted-foreground">
                Derived eligibility surfaced from current senior ages.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-gold-foreground">
            {loading ? "Loading..." : `${eligibilityFlags.length} flags to review`}
          </span>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {eligibilityFlags.slice(0, 6).map(({ senior, program, reason }) => (
            <div key={`${senior.id}-${program.type}`} className="rounded-2xl bg-secondary p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold">{senior.name}</p>
                <span className="shrink-0 text-xs font-bold text-gold-foreground">
                  Age {senior.age}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-coral">{program.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{reason}</p>
            </div>
          ))}
          {loading && <p className="text-sm text-muted-foreground">Loading senior records...</p>}
          {!loading && eligibilityFlags.length === 0 && (
            <p className="text-sm text-muted-foreground">No age threshold flags.</p>
          )}
        </div>
      </section>

      {showAnnouncementForm && currentUser?.role === "head" && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 px-4">
          <form
            onSubmit={handleCreateAnnouncement}
            className="surface-card w-full max-w-2xl overflow-hidden p-0 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <h2 className="text-2xl font-extrabold">Create announcement</h2>
              <button
                type="button"
                onClick={() => setShowAnnouncementForm(false)}
                aria-label="Close announcement form"
                className="grid h-10 w-10 place-items-center rounded-full bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3">
                <div className="bg-navy grid h-11 w-11 place-items-center rounded-full text-primary-foreground">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Bulan SeniorCare</p>
                  <p className="text-xs text-muted-foreground">Head announcement</p>
                </div>
              </div>
              <input
                required
                maxLength={180}
                value={announcementTitle}
                onChange={(event) => setAnnouncementTitle(event.target.value)}
                placeholder="Announcement title"
                className="mt-6 w-full border-b border-border bg-transparent py-3 text-lg outline-none placeholder:text-muted-foreground"
              />
              <textarea
                required
                maxLength={5000}
                value={announcementMessage}
                onChange={(event) => setAnnouncementMessage(event.target.value)}
                placeholder="What's the announcement?"
                rows={6}
                className="mt-3 w-full resize-none bg-transparent py-3 text-lg outline-none placeholder:text-muted-foreground"
              />
              <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-semibold">
                <ImagePlus className="h-5 w-5 text-gold-foreground" />
                <span className="flex-1">Add poster image</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => setAnnouncementImage(event.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </label>
              {announcementImagePreview && (
                <img
                  src={announcementImagePreview}
                  alt="Poster preview"
                  className="mt-3 max-h-56 w-full rounded-xl object-cover"
                />
              )}
              <div className="mt-4 rounded-xl border border-border px-4 py-3">
                <p className="text-sm font-semibold">Post to dashboard</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Everyone with portal access can view this announcement.
                </p>
              </div>
              {announcementError && (
                <p className="mt-4 text-sm font-medium text-destructive">{announcementError}</p>
              )}
              <button
                type="submit"
                disabled={announcementSaving}
                className="bg-navy mt-5 w-full rounded-xl py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {announcementSaving ? "Publishing..." : "Publish announcement"}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedAnnouncement && (
        <div
          className="fixed inset-0 z-30 grid place-items-center bg-black/50 px-4"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <article
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-preview-title"
            onClick={(event) => event.stopPropagation()}
            className="surface-card max-h-[90vh] w-full max-w-3xl overflow-y-auto p-0 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <p className="text-sm font-bold text-muted-foreground">Announcement preview</p>
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                aria-label="Close announcement preview"
                className="grid h-10 w-10 place-items-center rounded-full bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {selectedAnnouncement.image_path && (
              <img
                    src={`${import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ?? "http://127.0.0.1:8000"}/storage/${selectedAnnouncement.image_path}`}
                alt=""
                className="max-h-[65vh] w-full object-contain"
              />
            )}
            <div className="p-6">
              <h2 id="announcement-preview-title" className="text-2xl font-extrabold">
                {selectedAnnouncement.title}
              </h2>
              <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-muted-foreground">
                {selectedAnnouncement.message}
              </p>
              <p className="mt-5 text-sm text-muted-foreground">
                {new Date(selectedAnnouncement.published_at).toLocaleDateString()}
              </p>
              <div className="mt-6 border-t border-border pt-5">
                <h3 className="text-lg font-bold">Comments</h3>
                <div className="mt-3 space-y-3">
                  {selectedAnnouncement.comments?.map((comment: AnnouncementComment) => (
                    <div key={comment.id} className="rounded-xl bg-secondary p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold">{comment.user.name}</p>
                        <p className="text-xs text-muted-foreground">{comment.user.role}</p>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{comment.message}</p>
                      <button
                        type="button"
                        onClick={() => setReplyTo((current) => current === comment.id ? null : comment.id)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-foreground"
                      >
                        <CornerUpLeft className="h-3.5 w-3.5" /> Reply
                      </button>
                      {comment.replies?.map((reply) => (
                        <div key={reply.id} className="mt-3 ml-5 rounded-xl border-l-2 border-border bg-card p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-bold">{reply.user.name}</p>
                            <p className="text-[11px] text-muted-foreground">{reply.user.role}</p>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{reply.message}</p>
                        </div>
                      ))}
                      {replyTo === comment.id && (
                        <form onSubmit={(event) => handleCreateComment(event, comment.id)} className="mt-3 ml-5 flex gap-2">
                          <input
                            required
                            maxLength={2000}
                            autoFocus
                            value={replyMessage}
                            onChange={(event) => setReplyMessage(event.target.value)}
                            placeholder={`Reply to ${comment.user.name}`}
                            className="min-w-0 flex-1 rounded-xl bg-card px-3 py-2 text-sm outline-none"
                          />
                          <button type="submit" disabled={commentSaving} className="bg-navy rounded-xl px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">
                            {commentSaving ? "Sending..." : "Reply"}
                          </button>
                        </form>
                      )}
                    </div>
                  ))}
                  {!selectedAnnouncement.comments?.length && (
                    <p className="text-sm text-muted-foreground">No comments yet.</p>
                  )}
                </div>
                <form onSubmit={handleCreateComment} className="mt-4 flex gap-3">
                  <input
                    required
                    maxLength={2000}
                    value={commentMessage}
                    onChange={(event) => setCommentMessage(event.target.value)}
                    placeholder="Write a comment..."
                    className="min-w-0 flex-1 rounded-xl bg-secondary px-4 py-3 text-sm outline-none"
                  />
                  <button
                    type="submit"
                    disabled={commentSaving}
                    className="bg-navy rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {commentSaving ? "Sending..." : "Send"}
                  </button>
                </form>
              </div>
            </div>
          </article>
        </div>
      )}

    </AppShell>
  );
}
