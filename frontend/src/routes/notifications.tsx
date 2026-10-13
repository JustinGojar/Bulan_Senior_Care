import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Archive,
  ArchiveRestore,
  Bell,
  Check,
  CheckCheck,
  Mail,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { EligibilityFlagDialog } from "@/components/EligibilityFlagDialog";
import { EmptyState, SectionHeader, StatusPill } from "@/components/DesignKit";
import { panelClass, tileClass } from "@/components/design-kit";
import { IconActionButton } from "@/components/IconActionButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  apiFetch,
  archiveServerNotification,
  deleteServerNotification,
  getServerNotifications,
  getStoredUser,
  markServerNotificationRead,
  markServerNotificationUnread,
  type ServerNotification,
  type ApiSenior,
  unarchiveServerNotification,
} from "@/lib/api";
import {
  BENEFIT_PROGRAMS,
  claimMessage,
  findNewEligibilityFlags,
  type EligibilityFlag,
} from "@/lib/osca-data";
import { mapSenior } from "@/lib/use-seniors";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Bulan SeniorCare" }] }),
  component: Notifications,
});

function Notifications() {
  const navigate = useNavigate();
  const [serverNotifications, setServerNotifications] = useState<ServerNotification[]>([]);
  const [selectedNotificationIds, setSelectedNotificationIds] = useState<number[]>([]);
  const [view, setView] = useState<"inbox" | "archived">("inbox");
  const [selectedFlag, setSelectedFlag] = useState<EligibilityFlag | null>(null);

  // The inbox and archive views each show their own slice; actions only touch what is shown.
  const visibleNotifications = serverNotifications.filter((notification) =>
    view === "archived" ? Boolean(notification.archived_at) : !notification.archived_at,
  );
  const archivedCount = serverNotifications.filter(
    (notification) => notification.archived_at,
  ).length;
  const visibleUnreadCount = visibleNotifications.filter(
    (notification) => notification.status === "unread",
  ).length;

  const allSelected =
    visibleNotifications.length > 0 &&
    visibleNotifications.every((notification) => selectedNotificationIds.includes(notification.id));

  function notificationTitle(notification: ServerNotification) {
    if (notification.source_type === "benefit_release") return "Benefit release schedule";
    if (notification.source_type === "announcement") return "Announcement update";
    if (notification.source_type === "age_threshold") return "Age threshold alert";
    if (notification.message.toLowerCase().includes("comment")) return "Announcement comment";
    return "System notification";
  }

  // Opening the inbox does not mark anything read; that happens when a notification is
  // opened or marked read, so unread ones stay highlighted until the user deals with them.
  useEffect(() => {
    getServerNotifications()
      .then((notifications) => {
        setServerNotifications(notifications);
        setSelectedNotificationIds([]);
      })
      .catch(() => setServerNotifications([]));
  }, []);

  function replaceNotification(updated: ServerNotification) {
    setServerNotifications((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
    window.dispatchEvent(new Event("bulan-unread-updated"));
  }

  function runNotificationAction(action: Promise<ServerNotification>) {
    action.then(replaceNotification).catch(() => undefined);
  }

  function archiveNotification(notification: ServerNotification) {
    const action = notification.archived_at
      ? unarchiveServerNotification(notification.id)
      : archiveServerNotification(notification.id);
    action
      .then((updated) => {
        replaceNotification(updated);
        setSelectedNotificationIds((current) =>
          current.filter((selectedId) => selectedId !== notification.id),
        );
      })
      .catch(() => undefined);
  }

  function switchView(next: "inbox" | "archived") {
    setView(next);
    setSelectedNotificationIds([]);
  }

  function markAllServerNotificationsRead() {
    Promise.all(
      visibleNotifications
        .filter((notification) => notification.status === "unread")
        .map((notification) => markServerNotificationRead(notification.id)),
    )
      .then((updated) => {
        const updatedById = new Map(updated.map((notification) => [notification.id, notification]));
        setServerNotifications((current) =>
          current.map((notification) => updatedById.get(notification.id) ?? notification),
        );
        window.dispatchEvent(new Event("bulan-unread-updated"));
      })
      .catch(() => undefined);
  }

  function deleteNotification(id: number) {
    deleteServerNotification(id)
      .then(() => {
        setServerNotifications((current) =>
          current.filter((notification) => notification.id !== id),
        );
        setSelectedNotificationIds((current) => current.filter((selectedId) => selectedId !== id));
        window.dispatchEvent(new Event("bulan-unread-updated"));
      })
      .catch(() => undefined);
  }

  function toggleSelectAll() {
    setSelectedNotificationIds(
      allSelected ? [] : visibleNotifications.map((notification) => notification.id),
    );
  }

  function toggleNotificationSelection(id: number) {
    setSelectedNotificationIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    );
  }

  function clearSelectedNotifications() {
    if (selectedNotificationIds.length === 0) return;
    Promise.all(selectedNotificationIds.map((id) => deleteServerNotification(id)))
      .then(() => {
        const selectedIds = new Set(selectedNotificationIds);
        setServerNotifications((current) =>
          current.filter((notification) => !selectedIds.has(notification.id)),
        );
        setSelectedNotificationIds([]);
        window.dispatchEvent(new Event("bulan-unread-updated"));
      })
      .catch(() => undefined);
  }

  function handleOpenServerNotification(notification: ServerNotification) {
    const markRead =
      notification.status === "unread"
        ? markServerNotificationRead(notification.id)
            .then(replaceNotification)
            .catch(() => undefined)
        : Promise.resolve();
    void markRead.then(() => openSource(notification));
  }

  /** Goes to the page the notification is about. */
  function openSource(notification: ServerNotification) {
    const sourceId = notification.source_id;
    if (notification.source_type === "announcement" && sourceId) {
      return navigate({ to: "/dashboard", hash: `announcement-${sourceId}` });
    }
    if (notification.source_type === "benefit_release" && sourceId) {
      return navigate({ to: "/benefits", search: { release: sourceId } });
    }
    if (notification.source_type === "age_threshold" && notification.senior_osca_id) {
      return openAgeThresholdFlag(notification, notification.senior_osca_id);
    }
    return openSourcePage(notification);
  }

  /** Shows the same congratulations pop-up as the Age Threshold page for the alerted senior. */
  function openAgeThresholdFlag(notification: ServerNotification, oscaId: string) {
    apiFetch<ApiSenior>(`/seniors/${encodeURIComponent(oscaId)}`)
      .then((result) => {
        const senior = mapSenior(result);
        // The alert names the grant ("... is eligible for Nonagenarian Grant."), which still
        // applies after the senior's birthday has moved past the exact milestone age.
        const grantName = notification.message.split(" is eligible for ")[1]?.replace(/\.$/, "");
        const program =
          BENEFIT_PROGRAMS.find((item) => item.name === grantName?.trim()) ??
          findNewEligibilityFlags([senior])[0]?.program;
        if (!program) {
          void openSourcePage(notification);
          return;
        }
        setSelectedFlag({
          senior,
          program,
          reason: claimMessage(senior.name, senior.age, program.name),
        });
      })
      .catch(() => openSourcePage(notification));
  }

  function openSourcePage(notification: ServerNotification) {
    if (notification.source_type === "age_threshold") {
      // Admin and Head review flags on the Age Threshold page; BSCA Presidents cannot open it,
      // so they go to the senior's record instead. The message starts with the senior's name.
      if (getStoredUser()?.role !== "leader") return navigate({ to: "/age-threshold" });
      const seniorName = notification.message.split(" is eligible for ")[0]?.trim();
      return navigate({
        to: "/seniors",
        search: { q: seniorName || undefined, status: undefined },
      });
    }
    return navigate({ to: "/dashboard" });
  }

  return (
    <AppShell
      title="Notifications"
      subtitle="System alerts and operational messages"
      breadcrumb={["Dashboard", "Notifications"]}
    >
      <section className={`${panelClass} p-4 sm:p-7`}>
        <SectionHeader
          icon={Bell}
          title="Inbox"
          subtitle="Age threshold, benefit, report, and workflow notifications."
          badge={
            visibleUnreadCount > 0 ? (
              <StatusPill tone="gold">{visibleUnreadCount} unread</StatusPill>
            ) : undefined
          }
        />
        <div
          role="tablist"
          aria-label="Notification folders"
          className="mt-6 inline-flex rounded-lg border border-border/60 bg-muted/60 p-1"
        >
          {(["inbox", "archived"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={view === option}
              onClick={() => switchView(option)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${view === option ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {option === "inbox"
                ? "Inbox"
                : `Archived${archivedCount ? ` (${archivedCount})` : ""}`}
            </button>
          ))}
        </div>
        <div
          className={`${tileClass} mt-3 flex flex-wrap items-center justify-between gap-3 py-2.5`}
        >
          <label className="inline-flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              disabled={visibleNotifications.length === 0}
              className="h-4 w-4 accent-[var(--navy)]"
            />
            Select all
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <IconActionButton
              label="Mark all as read"
              variant="outline"
              icon={<CheckCheck className="h-4 w-4" />}
              className="h-10 w-10 text-xs hover:translate-y-0 sm:h-9 sm:px-3 sm:shadow-none"
              onClick={markAllServerNotificationsRead}
              disabled={visibleUnreadCount === 0}
            />
            <IconActionButton
              label={
                selectedNotificationIds.length > 0
                  ? `Clear selected (${selectedNotificationIds.length})`
                  : "Clear selected"
              }
              variant="outline"
              icon={<Trash2 className="h-4 w-4" />}
              badge={selectedNotificationIds.length}
              className="h-10 w-10 text-xs text-destructive hover:translate-y-0 sm:h-9 sm:px-3 sm:shadow-none dark:text-destructive"
              onClick={clearSelectedNotifications}
              disabled={selectedNotificationIds.length === 0}
            />
          </div>
        </div>
        <div className="mt-3 space-y-3">
          {visibleNotifications.map((notification) => (
            <div
              key={`server-${notification.id}`}
              onClick={() => handleOpenServerNotification(notification)}
              className={`${tileClass} flex cursor-pointer items-start gap-3 transition-colors sm:gap-4 hover:border-ring/40 ${notification.status === "unread" ? "border-l-4 border-l-gold" : "opacity-80"}`}
            >
              <input
                type="checkbox"
                checked={selectedNotificationIds.includes(notification.id)}
                onChange={() => toggleNotificationSelection(notification.id)}
                onClick={(event) => event.stopPropagation()}
                aria-label={`Select ${notificationTitle(notification)}`}
                className="mt-2 h-4 w-4 shrink-0 accent-[var(--navy)]"
              />
              <span
                className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${notification.status === "unread" ? "bg-navy text-gold" : "bg-muted text-muted-foreground"}`}
              >
                <Bell className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <span className="block">
                  <strong className="flex items-center gap-2 text-sm leading-snug">
                    {notificationTitle(notification)}
                    {notification.status === "unread" && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-gold" aria-label="Unread" />
                    )}
                  </strong>
                  <span className="mt-1 block break-words text-sm leading-relaxed text-muted-foreground sm:text-xs">
                    {notification.message}
                  </span>
                  <small className="mt-2 block text-xs text-muted-foreground">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </small>
                </span>
              </div>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={(event) => event.stopPropagation()}
                    aria-label="Notification options"
                    title="More options"
                    className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-44"
                  onClick={(event) => event.stopPropagation()}
                >
                  {notification.status === "unread" ? (
                    <DropdownMenuItem
                      onSelect={() =>
                        runNotificationAction(markServerNotificationRead(notification.id))
                      }
                    >
                      <Check className="h-4 w-4" />
                      Mark as read
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onSelect={() =>
                        runNotificationAction(markServerNotificationUnread(notification.id))
                      }
                    >
                      <Mail className="h-4 w-4" />
                      Mark as unread
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => archiveNotification(notification)}>
                    {notification.archived_at ? (
                      <>
                        <ArchiveRestore className="h-4 w-4" />
                        Move to inbox
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4" />
                        Archive
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => deleteNotification(notification.id)}
                    className="font-semibold text-destructive focus:bg-destructive/10 focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          {visibleNotifications.length === 0 && (
            <EmptyState
              icon={view === "archived" ? Archive : CheckCheck}
              title={view === "archived" ? "No archived notifications" : "Your inbox is clear"}
              description={
                view === "archived"
                  ? "Notifications you archive will show up here."
                  : "New alerts will show up here."
              }
            />
          )}
        </div>
      </section>
      <EligibilityFlagDialog flag={selectedFlag} onClose={() => setSelectedFlag(null)} />
    </AppShell>
  );
}
