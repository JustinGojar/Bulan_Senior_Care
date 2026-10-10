import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  CornerUpLeft,
  ImagePlus,
  Loader2,
  Megaphone,
  PieChart,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
  type LucideIcon,
  CheckCircle2,
  Clock3,
  Gift,
  MessageCircle,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { AuthAlert, authSubmitClass } from "@/components/AuthLayout";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, SectionHeader, SkeletonValue, TileSkeletons } from "@/components/DesignKit";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TONE_BAR,
  TONE_ICON,
  badgeClass,
  fieldClass,
  iconButtonClass,
  statCardClass,
  tileClass,
  type Tone,
} from "@/components/design-kit";
import seniorCitizensPhoto from "@/images/img.webp";
import {
  API_URL,
  apiFetch,
  createAnnouncement,
  createAnnouncementComment,
  deleteAnnouncement,
  deleteAnnouncementComment,
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

function announcementImageUrl(announcement: Announcement) {
  return announcement.image_path
    ? storageUrl(announcement.image_path)
    : announcement.source_image_url!;
}

function storageUrl(path: string) {
  return `${API_URL.replace(/\/api$/, "")}/storage/${path}`;
}

function CommentImage({ path }: { path?: string | null | undefined }) {
  if (!path) return null;
  const src = storageUrl(path);
  return (
    <a href={src} target="_blank" rel="noreferrer" className="mt-2 block w-fit">
      <img
        src={src}
        alt="Comment attachment"
        className="max-h-64 max-w-full rounded-lg border border-border object-contain"
      />
    </a>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function MonthlyChange({ value }: { value: number | null | undefined }) {
  if (value == null) {
    return <span className="text-[11px] text-muted-foreground">— vs. last month</span>;
  }

  const isIncrease = value >= 0;
  const TrendIcon = isIncrease ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${isIncrease ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
    >
      <TrendIcon className="h-3.5 w-3.5" />
      {Math.abs(value)}% vs. last month
    </span>
  );
}

function StatCardBody({
  icon: Icon,
  tone,
  label,
  value,
  change,
  description,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: ReactNode;
  change: number | null | undefined;
  description: string;
}) {
  return (
    <>
      <span className={`absolute inset-x-0 top-0 h-1 ${TONE_BAR[tone]}`} />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase sm:text-xs">
          {label}
        </p>
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg sm:h-10 sm:w-10 ${TONE_ICON[tone]} ${tone === "navy" ? "dark:ring-1 dark:ring-white/20" : ""}`}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
      </div>
      <p className="font-display mt-2 truncate text-xl leading-none font-extrabold sm:text-3xl">
        {value}
      </p>
      <p className="mt-3">
        <MonthlyChange value={change} />
      </p>
      <p className="mt-3 text-[11px] leading-snug text-muted-foreground sm:text-xs">
        {description}
      </p>
    </>
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
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [confirm, confirmDialog] = useConfirmDialog();
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
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

  async function handleDeleteAnnouncement(announcement: Announcement) {
    const ok = await confirm({
      title: "Delete this announcement?",
      description: `"${announcement.title}" and all of its comments will be removed for everyone.`,
      confirmLabel: "Delete announcement",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteAnnouncement(announcement.id);
      setAnnouncements((current) => current.filter((item) => item.id !== announcement.id));
      setSelectedAnnouncement(null);
      toast.success("Announcement deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete announcement.");
    }
  }

  async function handleDeleteComment(comment: AnnouncementComment) {
    if (!selectedAnnouncement) return;
    const ok = await confirm({
      title: "Delete this comment?",
      description: comment.replies?.length
        ? "The comment and its replies will be removed for everyone."
        : "The comment will be removed for everyone.",
      confirmLabel: "Delete comment",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteAnnouncementComment(selectedAnnouncement.id, comment.id);
      const comments = (selectedAnnouncement.comments ?? [])
        .filter((item) => item.id !== comment.id)
        .map((item) => ({
          ...item,
          replies: item.replies?.filter((reply) => reply.id !== comment.id) ?? [],
        }));
      setSelectedAnnouncement({ ...selectedAnnouncement, comments });
      setAnnouncements((current) =>
        current.map((announcement) =>
          announcement.id === selectedAnnouncement.id
            ? { ...announcement, comments }
            : announcement,
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete comment.");
    }
  }

  const canDeleteComment = (comment: AnnouncementComment) =>
    isHead || (currentUser != null && comment.user_id === currentUser.id);

  // A picked image belongs to the announcement it was picked for.
  useEffect(() => setCommentImage(null), [selectedAnnouncement?.id]);

  useEffect(() => {
    if (!commentImage) {
      setCommentImagePreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(commentImage);
    setCommentImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [commentImage]);

  async function handleCreateComment(
    event: React.FormEvent<HTMLFormElement>,
    parentCommentId?: number,
  ) {
    event.preventDefault();
    if (!selectedAnnouncement) return;
    const message = parentCommentId ? replyMessage : commentMessage;
    const image = parentCommentId ? null : commentImage;
    if (!message.trim() && !image) return;
    setCommentSaving(true);
    try {
      const comment = await createAnnouncementComment(
        selectedAnnouncement.id,
        message.trim(),
        parentCommentId,
        image,
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
      } else {
        setCommentMessage("");
        setCommentImage(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send comment.");
    } finally {
      setCommentSaving(false);
    }
  }

  // Admins see announcements and distribution side by side, so those cards share a height.
  const isAdminLayout = currentUser?.role === "admin";
  const firstName = currentUser?.name?.split(" ")[0];
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const distributionTotal =
    (overview?.benefits_distributed_count ?? 0) +
    (overview?.benefits_pending_count ?? 0) +
    (overview?.benefits_failed_count ?? 0);

  return (
    <AppShell
      title="System Dashboard"
      subtitle="Overview of OSCA Bulan operations and analytics"
      breadcrumb={["Dashboard"]}
    >
      <section className="relative mb-5 overflow-hidden rounded-[calc(var(--radius)+8px)] border border-border/60 text-white shadow-[var(--shadow-card)]">
        <img
          src={seniorCitizensPhoto}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-[center_35%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.22_0.06_258/0.96)] via-[oklch(0.25_0.06_258/0.9)] to-[oklch(0.26_0.06_258/0.62)]" />
        <div className="relative flex flex-wrap items-end justify-between gap-5 p-5 sm:p-8">
          <div className="min-w-0">
            <span className="inline-flex items-center rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-[11px] font-semibold tracking-wider text-gold uppercase">
              {today}
            </span>
            <p className="font-display mt-4 text-2xl leading-tight font-extrabold tracking-[-0.02em] sm:text-3xl">
              {greeting()}
              {firstName ? (
                <>
                  , <span className="text-gold">{firstName}</span>
                </>
              ) : null}
            </p>
            <p className="mt-2 max-w-md text-sm leading-relaxed opacity-85">
              Here&apos;s what&apos;s happening across senior citizen records and benefits in Bulan.
            </p>
          </div>
          {isHead && (
            <button
              type="button"
              onClick={() => setShowAnnouncementForm(true)}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-gold px-5 text-sm font-bold text-gold-foreground shadow-[var(--shadow-soft)]"
            >
              <Plus className="h-4 w-4" />
              New announcement
            </button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Link to="/seniors" search={{ q: undefined, status: undefined }} className={statCardClass}>
          <StatCardBody
            icon={Users}
            tone="navy"
            label="Total Registered"
            value={loading ? <SkeletonValue /> : totalCount.toLocaleString()}
            change={overview?.monthly_change.total_registered}
            description="Total number of senior citizens in the system."
          />
        </Link>
        <Link to="/benefits" className={statCardClass}>
          <StatCardBody
            icon={ShieldCheck}
            tone="gold"
            label="Benefits Distributed"
            value={
              overview ? (
                `₱${overview.benefits_distributed_amount.toLocaleString()}`
              ) : (
                <SkeletonValue className="h-7 w-24" />
              )
            }
            change={overview?.monthly_change.benefits_distributed_amount}
            description="Total amount of benefits released to senior citizens."
          />
        </Link>
        <Link to="/seniors" search={{ q: undefined, status: "active" }} className={statCardClass}>
          <StatCardBody
            icon={UserCheck}
            tone="success"
            label="Active Seniors"
            value={loading ? <SkeletonValue /> : activeCount.toLocaleString()}
            change={overview?.monthly_change.active_seniors}
            description="Seniors with active records and benefits."
          />
        </Link>
        <Link to="/seniors" search={{ q: undefined, status: "pending" }} className={statCardClass}>
          <StatCardBody
            icon={Clock}
            tone="coral"
            label="Pending Applications"
            value={loading ? <SkeletonValue /> : pendingCount.toLocaleString()}
            change={overview?.monthly_change.pending_applications}
            description="Applications awaiting verification or approval."
          />
        </Link>
      </div>

      <div className={isAdminLayout ? "mt-6 grid gap-6 lg:grid-cols-2" : "mt-6 space-y-6"}>
        <section
          className={`surface-card flex max-h-[430px] flex-col overflow-hidden border border-border/60 p-5 sm:p-7 ${isAdminLayout ? "lg:h-[430px]" : ""}`}
        >
          <SectionHeader
            icon={Megaphone}
            title="Announcements"
            badge={<span className={badgeClass}>{announcements.length} total</span>}
          />
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
                className={`${tileClass} cursor-pointer transition-[border-color,box-shadow] hover:border-ring/40 hover:shadow-[var(--shadow-soft)] focus-visible:outline-2 focus-visible:outline-ring`}
              >
                <p className="text-sm font-bold">{announcement.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{announcement.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(announcement.published_at).toLocaleDateString()}
                </p>
              </article>
            ))}
            {!announcements.length && (
              <EmptyState
                compact
                icon={Megaphone}
                title="No current announcements"
                description="Announcements from the OSCA Head will appear here."
              />
            )}
          </div>
        </section>
        {isHead && (
          <section className="surface-card border border-border/60 p-5 sm:p-7">
            <SectionHeader
              icon={PieChart}
              title="Benefits received by age"
              subtitle="Live count of seniors who received each age-based benefit."
              badge={
                <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-bold text-success">
                  {overview?.distribution_percentage ?? 0}% released
                </span>
              }
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(overview?.received_by_benefit ?? []).map((item) => (
                <div key={item.benefit} className={tileClass}>
                  <p className="text-sm font-bold">{item.benefit}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Age {item.age_range}</p>
                  <p className="font-display mt-3 text-2xl font-extrabold">{item.received_count}</p>
                  <p className="text-xs text-muted-foreground">seniors received</p>
                </div>
              ))}
              {overview && overview.received_by_benefit.length === 0 && (
                <EmptyState
                  compact
                  icon={Gift}
                  title="No released benefits yet"
                  description="Counts appear once age-based benefits are released."
                  className="sm:col-span-2 lg:col-span-4"
                />
              )}
            </div>
          </section>
        )}

        <section
          className={`surface-card overflow-hidden border border-border/60 p-5 sm:p-7 ${isAdminLayout ? "lg:h-[430px]" : ""}`}
        >
          <SectionHeader
            icon={Clock}
            title="Distribution Status"
            badge={
              <span className={`${badgeClass} inline-flex items-center gap-1.5`}>
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Live
              </span>
            }
          />
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
                text: "text-gold-foreground dark:text-gold",
              },
              {
                label: "Not received",
                value: overview?.benefits_failed_count ?? 0,
                color: "bg-coral",
                text: "text-coral",
              },
            ].map((item) => {
              const percentage =
                distributionTotal > 0 ? Math.round((item.value / distributionTotal) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{item.label}</span>
                    <span className="text-muted-foreground">
                      {overview ? (
                        <>
                          <span className={`font-bold ${item.text}`}>{item.value}</span>
                          <span className="ml-1.5 text-xs">({percentage}%)</span>
                        </>
                      ) : (
                        <Skeleton className="inline-block h-3.5 w-14 align-middle" />
                      )}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {!overview && (
              <span role="status" className="sr-only">
                Loading distribution data
              </span>
            )}
            {overview && distributionTotal === 0 && (
              <EmptyState
                compact
                icon={Clock3}
                title="No benefit transactions yet"
                description="Release progress shows here once benefits are recorded."
              />
            )}
          </div>
        </section>
      </div>

      <section className="surface-card mt-6 border border-border/60 p-5 sm:p-7">
        <SectionHeader
          icon={AlertTriangle}
          title="Age Threshold Detection"
          subtitle="Derived eligibility surfaced from current senior ages."
          badge={
            <span className="rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-bold text-gold-foreground dark:text-gold">
              {loading ? "Loading..." : `${eligibilityFlags.length} flags to review`}
            </span>
          }
        />
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {eligibilityFlags.slice(0, 6).map(({ senior, program, reason }) => (
            <div key={`${senior.id}-${program.type}`} className={tileClass}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold">{senior.name}</p>
                <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold-foreground dark:text-gold">
                  Age {senior.age}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-coral">{program.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{reason}</p>
            </div>
          ))}
          {loading && <TileSkeletons label="Loading senior records" />}
          {!loading && eligibilityFlags.length === 0 && (
            <EmptyState
              icon={CheckCircle2}
              title="No age threshold flags"
              description="Seniors who reach a benefit age will be flagged here."
              className="md:col-span-2 xl:col-span-3"
            />
          )}
        </div>
      </section>

      {showAnnouncementForm && isHead && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/50 px-4 backdrop-blur-[2px]">
          <form
            onSubmit={handleCreateAnnouncement}
            className="surface-card max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-border/60 p-0 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="bg-navy grid h-10 w-10 place-items-center rounded-lg">
                  <Megaphone className="h-4 w-4 text-gold" />
                </span>
                <div>
                  <h2 className="text-xl font-extrabold">Create announcement</h2>
                  <p className="text-xs text-muted-foreground">
                    Everyone with portal access can view this announcement.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAnnouncementForm(false)}
                aria-label="Close announcement form"
                className={iconButtonClass}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 p-6">
              {announcementError && <AuthAlert tone="error">{announcementError}</AuthAlert>}
              <div>
                <label htmlFor="announcement-title" className="mb-2 block text-sm font-semibold">
                  Title
                </label>
                <input
                  id="announcement-title"
                  required
                  maxLength={180}
                  value={announcementTitle}
                  onChange={(event) => setAnnouncementTitle(event.target.value)}
                  placeholder="Announcement title"
                  className={`${fieldClass} h-12`}
                />
              </div>
              <div>
                <label htmlFor="announcement-message" className="mb-2 block text-sm font-semibold">
                  Message
                </label>
                <textarea
                  id="announcement-message"
                  required
                  maxLength={5000}
                  value={announcementMessage}
                  onChange={(event) => setAnnouncementMessage(event.target.value)}
                  placeholder="What's the announcement?"
                  rows={6}
                  className={`${fieldClass} resize-none py-3`}
                />
              </div>
              <div>
                <p className="mb-2 block text-sm font-semibold">
                  Poster image <span className="font-normal text-muted-foreground">(optional)</span>
                </p>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input bg-background/60 px-4 py-3 text-sm font-semibold transition-colors hover:border-ring">
                  <ImagePlus className="h-5 w-5 text-gold-foreground dark:text-gold" />
                  <span className="flex-1 truncate">
                    {announcementImage ? announcementImage.name : "Choose a JPG, PNG or WebP image"}
                  </span>
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
                    className="mt-3 max-h-56 w-full rounded-lg object-cover"
                  />
                )}
              </div>
              <button type="submit" disabled={announcementSaving} className={authSubmitClass}>
                {announcementSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Publish announcement
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedAnnouncement && (
        <div
          className="fixed inset-0 z-30 grid place-items-center bg-black/50 px-4 backdrop-blur-[2px]"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <article
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-preview-title"
            onClick={(event) => event.stopPropagation()}
            className="surface-card max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-border/60 p-0 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Announcement
              </p>
              <div className="flex items-center gap-2">
                {isHead && (
                  <button
                    type="button"
                    onClick={() => handleDeleteAnnouncement(selectedAnnouncement)}
                    aria-label="Delete announcement"
                    title="Delete announcement"
                    className={`${iconButtonClass} text-destructive`}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedAnnouncement(null)}
                  aria-label="Close announcement preview"
                  className={iconButtonClass}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            {(selectedAnnouncement.image_path || selectedAnnouncement.source_image_url) && (
              <img
                src={announcementImageUrl(selectedAnnouncement)}
                alt=""
                className="max-h-[65vh] w-full bg-muted object-contain"
              />
            )}
            <div className="p-6">
              <h2 id="announcement-preview-title" className="text-2xl font-extrabold">
                {selectedAnnouncement.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Date(selectedAnnouncement.published_at).toLocaleDateString()}
              </p>
              <p className="mt-4 text-base leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {selectedAnnouncement.message}
              </p>
              {selectedAnnouncement.source_url && (
                <a
                  href={selectedAnnouncement.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
                >
                  View original Facebook post
                </a>
              )}
              <div className="mt-6 border-t border-border pt-5">
                <h3 className="text-lg font-bold">Comments</h3>
                <div className="mt-3 space-y-3">
                  {selectedAnnouncement.comments?.map((comment: AnnouncementComment) => (
                    <div key={comment.id} className={`${tileClass} p-3`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold">{comment.user.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">{comment.user.role}</p>
                          {canDeleteComment(comment) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment)}
                              aria-label="Delete comment"
                              title="Delete comment"
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      {comment.message && (
                        <p className="mt-1 text-sm text-muted-foreground">{comment.message}</p>
                      )}
                      <CommentImage path={comment.image_path} />
                      <button
                        type="button"
                        onClick={() =>
                          setReplyTo((current) => (current === comment.id ? null : comment.id))
                        }
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                      >
                        <CornerUpLeft className="h-3.5 w-3.5" /> Reply
                      </button>
                      {comment.replies?.map((reply) => (
                        <div
                          key={reply.id}
                          className="mt-3 ml-5 rounded-lg border-l-2 border-gold/60 bg-card p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-bold">{reply.user.name}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-[11px] text-muted-foreground">{reply.user.role}</p>
                              {canDeleteComment(reply) && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(reply)}
                                  aria-label="Delete reply"
                                  title="Delete reply"
                                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          {reply.message && (
                            <p className="mt-1 text-sm text-muted-foreground">{reply.message}</p>
                          )}
                          <CommentImage path={reply.image_path} />
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
                            className={`${fieldClass} h-10 min-w-0 flex-1`}
                          />
                          <button
                            type="submit"
                            disabled={commentSaving}
                            className="bg-navy h-10 rounded-lg px-4 text-xs font-bold text-white disabled:opacity-70"
                          >
                            {commentSaving ? "Sending..." : "Reply"}
                          </button>
                        </form>
                      )}
                    </div>
                  ))}
                  {!selectedAnnouncement.comments?.length && (
                    <EmptyState
                      compact
                      icon={MessageCircle}
                      title="No comments yet"
                      description="Be the first to reply to this announcement."
                    />
                  )}
                </div>
                {commentImagePreview && (
                  <div className="relative mt-4 w-fit">
                    <img
                      src={commentImagePreview}
                      alt="Selected attachment"
                      className="max-h-40 rounded-lg border border-border object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setCommentImage(null)}
                      aria-label="Remove image"
                      className="absolute -top-2 -right-2 rounded-full bg-card p-1 shadow ring-1 ring-border"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <form onSubmit={handleCreateComment} className="mt-4 flex gap-3">
                  <label
                    className="inline-flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-card hover:bg-muted"
                    title="Attach an image"
                  >
                    <ImagePlus className="h-5 w-5 text-gold-foreground dark:text-gold" />
                    <span className="sr-only">Attach an image</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        event.target.value = "";
                        if (file && file.size > 5 * 1024 * 1024) {
                          toast.error("Image must be 5 MB or smaller.");
                          return;
                        }
                        setCommentImage(file);
                      }}
                    />
                  </label>
                  <input
                    required={!commentImage}
                    maxLength={2000}
                    value={commentMessage}
                    onChange={(event) => setCommentMessage(event.target.value)}
                    placeholder="Write a comment..."
                    aria-label="Write a comment"
                    className={`${fieldClass} h-12 min-w-0 flex-1`}
                  />
                  <button
                    type="submit"
                    disabled={commentSaving}
                    className="bg-navy inline-flex h-12 items-center gap-2 rounded-lg px-5 text-sm font-bold text-white disabled:opacity-70"
                  >
                    {commentSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send
                  </button>
                </form>
              </div>
            </div>
          </article>
        </div>
      )}
      {confirmDialog}
    </AppShell>
  );
}
