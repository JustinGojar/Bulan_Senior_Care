import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  CornerUpLeft,
  ImagePlus,
  Megaphone,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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

function MonthlyChange({ value }: { value: number | null | undefined }) {
  if (value == null) {
    return <span className="text-[10px] text-muted-foreground">— vs. last month</span>;
  }

  const isIncrease = value >= 0;
  const TrendIcon = isIncrease ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${isIncrease ? "text-emerald-600" : "text-rose-600"}`}
    >
      <TrendIcon className="h-3.5 w-3.5" />
      {Math.abs(value)}% vs. last month
    </span>
  );
}

function Dashboard() {
  const { seniors, totalCount, activeCount, pendingCount, loading } = useSeniors();
  const currentUser = getStoredUser();
  const isHead =
    currentUser?.role?.toLowerCase() === "head" ||
    currentUser?.roles?.some((role) => role.name.toLowerCase() === "head");
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
    seniors.filter((senior) => senior.status === "Active"),
  );
  useEffect(() => {
    getAnnouncements()
      .then((loadedAnnouncements) => {
        setAnnouncements(loadedAnnouncements);
        const match = window.location.hash.match(/^#announcement-(\d+)$/);
        const announcement = match
          ? loadedAnnouncements.find((item) => item.id === Number(match[1]))
          : undefined;
        if (announcement) setSelectedAnnouncement(announcement);
      })
      .catch(() => setAnnouncements([]));
  }, []);

  useEffect(() => {
    const openAnnouncementFromHash = () => {
      const match = window.location.hash.match(/^#announcement-(\d+)$/);
      const announcement = match
        ? announcements.find((item) => item.id === Number(match[1]))
        : undefined;
      if (announcement) setSelectedAnnouncement(announcement);
    };

    openAnnouncementFromHash();
    window.addEventListener("hashchange", openAnnouncementFromHash);
    return () => window.removeEventListener("hashchange", openAnnouncementFromHash);
  }, [announcements]);

  useEffect(() => {
    apiFetch<Overview>("/overview")
      .then(setOverview)
      .catch(() => setOverview(null));
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
      const announcement = await createAnnouncement(
        announcementTitle,
        announcementMessage,
        announcementImage,
      );
      setAnnouncements((current) => [announcement, ...current]);
      setAnnouncementTitle("");
      setAnnouncementMessage("");
      setAnnouncementImage(null);
      setShowAnnouncementForm(false);
    } catch (error) {
      setAnnouncementError(
        error instanceof Error ? error.message : "Unable to create announcement.",
      );
    } finally {
      setAnnouncementSaving(false);
    }
  }

  async function handleCreateComment(
    event: React.FormEvent<HTMLFormElement>,
    parentCommentId?: number,
  ) {
    event.preventDefault();
    if (!selectedAnnouncement) return;
    const message = parentCommentId ? replyMessage : commentMessage;
    if (!message.trim()) return;
    setCommentSaving(true);
    try {
      const comment = await createAnnouncementComment(
        selectedAnnouncement.id,
        message.trim(),
        parentCommentId,
      );
      const comments = parentCommentId
        ? (selectedAnnouncement.comments ?? []).map((item) =>
            item.id === parentCommentId
              ? { ...item, replies: [...(item.replies ?? []), comment] }
              : item,
          )
        : [...(selectedAnnouncement.comments ?? []), comment];
      setSelectedAnnouncement({ ...selectedAnnouncement, comments });
      setAnnouncements((current) =>
        current.map((announcement) =>
          announcement.id === selectedAnnouncement.id
            ? { ...announcement, comments }
            : announcement,
        ),
      );
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
      {isHead && (
        <button
          type="button"
          onClick={() => setShowAnnouncementForm(true)}
          className="surface-card mb-4 flex w-full items-center gap-3 p-3 text-left transition-shadow hover:shadow-[var(--shadow-soft)] sm:mb-5 sm:gap-4 sm:p-4"
        >
          <div className="bg-navy grid h-10 w-10 shrink-0 place-items-center rounded-full text-primary-foreground sm:h-11 sm:w-11">
            <Megaphone className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <span className="flex-1 text-sm text-muted-foreground">What is the announcement?</span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <Link
          to="/seniors"
          search={{ q: undefined, status: undefined }}
          className="relative isolate flex min-h-[168px] overflow-hidden rounded-xl border border-[#173A52]/35 bg-white p-3 shadow-[0_8px_24px_rgba(23,58,82,0.14)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#173A52]/[0.04] hover:shadow-[var(--shadow-soft)] focus-visible:outline-2 focus-visible:outline-ring dark:bg-[#173A52] dark:hover:bg-[#173A52]/80 sm:min-h-[184px] sm:p-5"
        >
          <Users className="pointer-events-none absolute right-3 bottom-4 -z-10 h-10 w-10 sm:right-4 sm:bottom-5 sm:h-14 sm:w-14 md:h-16 md:w-16 text-[#173A52]/15" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full sm:h-10 sm:w-10 bg-[#173A52] text-white shadow-[0_6px_14px_rgba(23,58,82,0.32)]">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <p className="text-xs font-bold leading-tight text-foreground sm:text-sm">
                Total Registered
              </p>
            </div>
            <p className="mt-2 ml-10 truncate font-display text-2xl font-extrabold leading-none text-foreground sm:ml-[52px] sm:text-3xl">
              {loading ? "..." : totalCount.toLocaleString()}
            </p>
            <p className="mt-2 ml-1">
              <MonthlyChange value={overview?.monthly_change.total_registered} />
            </p>
            <p className="mt-2 max-w-[220px] pr-8 text-[10px] leading-snug text-muted-foreground sm:mt-3 sm:pr-0 sm:text-[11px] sm:leading-relaxed">
              Total number of senior citizens in the system.
            </p>
          </div>
        </Link>

        <Link
          to="/benefits"
          className="relative isolate flex min-h-[168px] overflow-hidden rounded-xl border border-[#DCAC4D]/45 bg-white p-3 shadow-[0_8px_24px_rgba(220,172,77,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#DCAC4D]/[0.08] hover:shadow-[var(--shadow-soft)] focus-visible:outline-2 focus-visible:outline-ring dark:bg-[#594B2D] dark:hover:bg-[#594B2D]/80 sm:min-h-[184px] sm:p-5"
        >
          <ShieldCheck className="pointer-events-none absolute right-3 bottom-4 -z-10 h-10 w-10 sm:right-4 sm:bottom-5 sm:h-14 sm:w-14 md:h-16 md:w-16 text-[#DCAC4D]/25" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full sm:h-10 sm:w-10 bg-[#DCAC4D] text-white shadow-[0_6px_14px_rgba(220,172,77,0.36)]">
                <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <p className="text-xs font-bold leading-tight text-foreground sm:text-sm">
                Total Benefits Distributed
              </p>
            </div>
            <p className="mt-2 ml-10 truncate font-display text-xl font-extrabold leading-none text-foreground sm:ml-[52px] sm:text-3xl">
              {overview ? `₱${overview.benefits_distributed_amount.toLocaleString()}` : "..."}
            </p>
            <p className="mt-2 ml-1">
              <MonthlyChange value={overview?.monthly_change.benefits_distributed_amount} />
            </p>
            <p className="mt-2 max-w-[220px] pr-8 text-[10px] leading-snug text-muted-foreground sm:mt-3 sm:pr-0 sm:text-[11px] sm:leading-relaxed">
              Total amount of benefits released to senior citizens.
            </p>
          </div>
        </Link>

        <Link
          to="/seniors"
          search={{ q: undefined, status: "active" }}
          className="relative isolate flex min-h-[168px] overflow-hidden rounded-xl border border-[#1B9E70]/40 bg-white p-3 shadow-[0_8px_24px_rgba(27,158,112,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1B9E70]/[0.06] hover:shadow-[var(--shadow-soft)] focus-visible:outline-2 focus-visible:outline-ring dark:bg-[#164B3A] dark:hover:bg-[#164B3A]/80 sm:min-h-[184px] sm:p-5"
        >
          <UserCheck className="pointer-events-none absolute right-3 bottom-4 -z-10 h-10 w-10 sm:right-4 sm:bottom-5 sm:h-14 sm:w-14 md:h-16 md:w-16 text-[#1B9E70]/25" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full sm:h-10 sm:w-10 bg-[#1B9E70] text-white shadow-[0_6px_14px_rgba(27,158,112,0.36)]">
                <UserCheck className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <p className="text-xs font-bold leading-tight text-foreground sm:text-sm">
                Active Seniors
              </p>
            </div>
            <p className="mt-2 ml-10 truncate font-display text-2xl font-extrabold leading-none text-foreground sm:ml-[52px] sm:text-3xl">
              {loading ? "..." : activeCount.toLocaleString()}
            </p>
            <p className="mt-2 ml-1">
              <MonthlyChange value={overview?.monthly_change.active_seniors} />
            </p>
            <p className="mt-2 max-w-[220px] pr-8 text-[10px] leading-snug text-muted-foreground sm:mt-3 sm:pr-0 sm:text-[11px] sm:leading-relaxed">
              Seniors with active records and benefits.
            </p>
          </div>
        </Link>

        <Link
          to="/seniors"
          search={{ q: undefined, status: "pending" }}
          className="relative isolate flex min-h-[168px] overflow-hidden rounded-xl border border-[#EB625D]/40 bg-white p-3 shadow-[0_8px_24px_rgba(235,98,93,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#EB625D]/[0.06] hover:shadow-[var(--shadow-soft)] focus-visible:outline-2 focus-visible:outline-ring dark:bg-[#5C2E2C] dark:hover:bg-[#5C2E2C]/80 sm:min-h-[184px] sm:p-5"
        >
          <Clock className="pointer-events-none absolute right-3 bottom-4 -z-10 h-10 w-10 sm:right-4 sm:bottom-5 sm:h-14 sm:w-14 md:h-16 md:w-16 text-[#EB625D]/25" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full sm:h-10 sm:w-10 bg-[#EB625D] text-white shadow-[0_6px_14px_rgba(235,98,93,0.36)]">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <p className="text-xs font-bold leading-tight text-foreground sm:text-sm">
                Pending Applications
              </p>
            </div>
            <p className="mt-2 ml-10 truncate font-display text-2xl font-extrabold leading-none text-foreground sm:ml-[52px] sm:text-3xl">
              {loading ? "..." : pendingCount.toLocaleString()}
            </p>
            <p className="mt-2 ml-1">
              <MonthlyChange value={overview?.monthly_change.pending_applications} />
            </p>
            <p className="mt-2 max-w-[220px] pr-8 text-[10px] leading-snug text-muted-foreground sm:mt-3 sm:pr-0 sm:text-[11px] sm:leading-relaxed">
              Applications awaiting verification or approval.
            </p>
          </div>
        </Link>
      </div>

      <div
        className={
          currentUser?.role === "admin" ? "mt-6 grid gap-6 lg:grid-cols-2" : "mt-6 space-y-6"
        }
      >
        <section className="surface-card flex max-h-[430px] flex-col overflow-hidden p-5 sm:p-7 lg:h-[430px]">
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
                {(announcement.image_path || announcement.source_image_url) && (
                  <img
                    src={
                      announcement.image_path
                        ? `${import.meta.env["VITE_API_URL"]?.replace(/\/api\/?$/, "") ?? "http://127.0.0.1:8000"}/storage/${announcement.image_path}`
                        : announcement.source_image_url!
                    }
                    alt=""
                    className="mb-3 h-auto w-full rounded-xl bg-card object-cover"
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
        {isHead && (
          <section className="surface-card p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Benefits received by age</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Live count of seniors who received each age-based benefit.
                </p>
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

        <section className="surface-card overflow-hidden p-5 sm:p-7 lg:h-[430px]">
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
              {
                label: "Received",
                value: overview?.benefits_distributed_count ?? 0,
                color: "bg-success",
                text: "text-success",
              },
              {
                label: "Pending",
                value: overview?.benefits_pending_count ?? 0,
                color: "bg-gold",
                text: "text-gold-foreground",
              },
              {
                label: "Not received",
                value: overview?.benefits_failed_count ?? 0,
                color: "bg-coral",
                text: "text-coral",
              },
            ].map((item) => {
              const total =
                (overview?.benefits_distributed_count ?? 0) +
                (overview?.benefits_pending_count ?? 0) +
                (overview?.benefits_failed_count ?? 0);
              const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{item.label}</span>
                    <span className={`font-bold ${item.text}`}>{item.value}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-secondary">
                    <div
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {!overview && (
              <p className="text-sm text-muted-foreground">Loading distribution data...</p>
            )}
            {overview &&
              overview.benefits_distributed_count +
                overview.benefits_pending_count +
                overview.benefits_failed_count ===
                0 && (
                <p className="text-sm text-muted-foreground">
                  No benefit transactions recorded yet.
                </p>
              )}
          </div>
        </section>
      </div>

      <section className="surface-card mt-6 p-5 sm:p-7">
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

      {showAnnouncementForm && isHead && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/50 backdrop-blur-[2px] px-4">
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
          className="fixed inset-0 z-30 grid place-items-center bg-black/50 backdrop-blur-[2px] px-4"
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
            {(selectedAnnouncement.image_path || selectedAnnouncement.source_image_url) && (
              <img
                src={
                  selectedAnnouncement.image_path
                    ? `${import.meta.env["VITE_API_URL"]?.replace(/\/api\/?$/, "") ?? "http://127.0.0.1:8000"}/storage/${selectedAnnouncement.image_path}`
                    : selectedAnnouncement.source_image_url!
                }
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
              {selectedAnnouncement.source_url && (
                <a
                  href={selectedAnnouncement.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-semibold text-foreground underline underline-offset-4"
                >
                  View original Facebook post
                </a>
              )}
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
                        onClick={() =>
                          setReplyTo((current) => (current === comment.id ? null : comment.id))
                        }
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-foreground"
                      >
                        <CornerUpLeft className="h-3.5 w-3.5" /> Reply
                      </button>
                      {comment.replies?.map((reply) => (
                        <div
                          key={reply.id}
                          className="mt-3 ml-5 rounded-xl border-l-2 border-border bg-card p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-bold">{reply.user.name}</p>
                            <p className="text-[11px] text-muted-foreground">{reply.user.role}</p>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{reply.message}</p>
                        </div>
                      ))}
                      {replyTo === comment.id && (
                        <form
                          onSubmit={(event) => handleCreateComment(event, comment.id)}
                          className="mt-3 ml-5 flex gap-2"
                        >
                          <input
                            required
                            maxLength={2000}
                            autoFocus
                            value={replyMessage}
                            onChange={(event) => setReplyMessage(event.target.value)}
                            placeholder={`Reply to ${comment.user.name}`}
                            className="min-w-0 flex-1 rounded-xl bg-card px-3 py-2 text-sm outline-none"
                          />
                          <button
                            type="submit"
                            disabled={commentSaving}
                            className="bg-navy rounded-xl px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                          >
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
