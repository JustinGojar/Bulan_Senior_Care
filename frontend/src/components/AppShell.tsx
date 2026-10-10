import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  ChevronRight,
  ClipboardCheck,
  HandCoins,
  Home,
  LayoutGrid,
  Mail,
  LogOut,
  Megaphone,
  Menu,
  Search,
  Settings,
  UserCircle,
  UserCog,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  API_URL,
  apiFetch,
  getBarangays,
  clearSession,
  getAnnouncements,
  getServerUnreadNotificationCount,
  getStoredUser,
  getSessionId,
  getUnreadMessageSummary,
  logout,
  type Announcement,
  type ApiSenior,
  type ApiUser,
  type PaginatedResponse,
} from "@/lib/api";
import defaultProfileImage from "@/img/Defaut.png";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { BrandLogo } from "./BrandLogo";
import { LogoutConfirmDialog } from "./LogoutConfirmDialog";
import { SessionTimeout } from "./SessionTimeout";
import { panelClass, tileClass } from "./design-kit";
import { ThemeToggle } from "./ThemeToggle";

const UNREAD_REFRESH_INTERVAL = 15_000;

type UnreadKind = "notifications" | "messages";
// Last known badge counts, kept across page switches so each navigation doesn't refetch them.
const unreadCache: Record<
  UnreadKind,
  { session: string | null; count: number; fetchedAt: number }
> = {
  notifications: { session: null, count: 0, fetchedAt: 0 },
  messages: { session: null, count: 0, fetchedAt: 0 },
};

function cachedUnreadCount(kind: UnreadKind) {
  if (typeof window === "undefined") return 0;
  const cached = unreadCache[kind];
  return cached.session === getSessionId() ? cached.count : 0;
}

// Polls a badge count while the tab is visible; background tabs stop hitting the API.
function watchUnreadCount(
  kind: UnreadKind,
  load: () => Promise<{ count: number }>,
  setCount: (count: number) => void,
) {
  let active = true;
  const refresh = (force: boolean) => {
    const session = getSessionId();
    const cached = unreadCache[kind];
    if (
      !force &&
      cached.session === session &&
      Date.now() - cached.fetchedAt < UNREAD_REFRESH_INTERVAL
    ) {
      setCount(cached.count);
      return;
    }
    load()
      .then(({ count }) => {
        unreadCache[kind] = { session, count, fetchedAt: Date.now() };
        if (active) setCount(count);
      })
      .catch(() => {
        if (active) setCount(0);
      });
  };
  const timer = window.setInterval(() => {
    if (!document.hidden) refresh(true);
  }, UNREAD_REFRESH_INTERVAL);
  const handleVisibilityChange = () => {
    if (!document.hidden) refresh(false);
  };
  const handleUnreadUpdated = () => refresh(true);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("bulan-unread-updated", handleUnreadUpdated);
  refresh(false);
  return () => {
    active = false;
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("bulan-unread-updated", handleUnreadUpdated);
  };
}

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/seniors", label: "Senior Record", icon: Users },
  { to: "/eligibility", label: "Eligibility Review", icon: ClipboardCheck },
  { to: "/age-threshold", label: "Age Threshold", icon: ClipboardCheck },
  { to: "/benefits", label: "Benefit Tracking", icon: HandCoins },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/users", label: "User Management", icon: UserCog },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

// Pages reached from inside a section keep that section's menu item highlighted.
const NAV_PARENT: Record<string, string> = {
  "/audit-logs": "/settings",
  "/reports": "/analytics",
  "/releases": "/benefits",
};

function isNavActive(pathname: string, to: string) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return path === to || path.startsWith(`${to}/`) || NAV_PARENT[path] === to;
}

function headerIconClass(active: boolean) {
  return `relative grid h-10 w-10 place-items-center rounded-lg border shadow-[var(--shadow-soft)] backdrop-blur-sm transition-colors sm:h-11 sm:w-11 ${
    active
      ? "bg-navy border-transparent text-gold dark:ring-1 dark:ring-white/15"
      : "border-border/60 bg-card/90 hover:bg-muted"
  }`;
}

export function AppShell({
  title,
  subtitle,
  breadcrumb,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  breadcrumb: string[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [assignedBarangay, setAssignedBarangay] = useState("");
  const [unreadCount, setUnreadCount] = useState(() => cachedUnreadCount("notifications"));
  const [unreadMessageCount, setUnreadMessageCount] = useState(() => cachedUnreadCount("messages"));
  const [globalSearch, setGlobalSearch] = useState("");
  const [seniorMatches, setSeniorMatches] = useState<ApiSenior[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  // Close the profile menu on an outside click or Escape.
  useEffect(() => {
    if (!profileOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);
  useEffect(() => {
    setUser(getStoredUser());
    const handleUserUpdated = (event: Event) => {
      setUser((event as CustomEvent<ApiUser>).detail);
    };
    window.addEventListener("bulan-user-updated", handleUserUpdated);
    return () => window.removeEventListener("bulan-user-updated", handleUserUpdated);
  }, []);
  useEffect(() => {
    // Announcements only feed global search, so load them once search is first used.
    if (!searchOpen) return;
    getAnnouncements()
      .then(setAnnouncements)
      .catch(() => setAnnouncements([]));
  }, [searchOpen]);
  useEffect(() => {
    if (user?.role?.toLowerCase() !== "leader" || !user.barangay_id) {
      setAssignedBarangay("");
      return;
    }
    getBarangays()
      .then((barangays) =>
        setAssignedBarangay(
          barangays.find((barangay) => barangay.id === user.barangay_id)?.barangay_name ?? "",
        ),
      )
      .catch(() => setAssignedBarangay(""));
  }, [user?.barangay_id, user?.role]);
  useEffect(() => {
    if (user?.role?.toLowerCase() === "admin") {
      setUnreadMessageCount(0);
      return;
    }
    if (!user?.id) {
      setUnreadMessageCount(0);
      return;
    }
    return watchUnreadCount("messages", getUnreadMessageSummary, setUnreadMessageCount);
  }, [user?.id, user?.role]);
  useEffect(
    () => watchUnreadCount("notifications", getServerUnreadNotificationCount, setUnreadCount),
    [],
  );
  useEffect(() => {
    const term = globalSearch.trim();
    if (term.length < 2) {
      setSeniorMatches([]);
      setSearchLoading(false);
      return;
    }

    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setSearchLoading(true);
      const seniorRequest = apiFetch<PaginatedResponse<ApiSenior>>(
        `/seniors?search=${encodeURIComponent(term)}&per_page=5`,
        { signal: controller.signal },
      )
        .then((result) => result.data)
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            console.error("Unable to search senior records.", error);
          }
          return [] as ApiSenior[];
        });

      seniorRequest
        .then((seniors) => {
          if (!active) return;
          setSeniorMatches(seniors);
        })
        .finally(() => {
          if (active) setSearchLoading(false);
        });
    }, 500);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [globalSearch]);
  const initials = (user?.name ?? "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const roleLabel =
    user?.role?.toLowerCase() === "leader"
      ? `BSCA President${assignedBarangay ? ` - ${assignedBarangay}` : ""}`
      : user?.role?.toLowerCase() === "head"
        ? "OSCA Head"
        : user?.role?.toLowerCase() === "admin"
          ? "OSCA Admin"
          : (user?.role ?? "Admin");
  const isAdmin =
    user?.role?.toLowerCase() === "admin" ||
    user?.roles?.some((role) => role.name.toLowerCase() === "admin");
  const photoUrl = user?.profile_photo_path
    ? `${API_URL.replace(/\/api$/, "")}/storage/${user.profile_photo_path}`
    : defaultProfileImage;
  const visibleNav = NAV.filter(
    ({ to }) =>
      (to !== "/users" || user?.role === "admin") &&
      (to !== "/eligibility" || user?.role !== "leader") &&
      (to !== "/age-threshold" || user?.role !== "leader"),
  );
  const normalizedSearch = globalSearch.trim().toLowerCase();
  const matchingPages =
    normalizedSearch.length >= 2
      ? visibleNav.filter((item) => item.label.toLowerCase().includes(normalizedSearch))
      : [];
  const announcementMatches =
    normalizedSearch.length >= 2
      ? announcements
          .filter((announcement) =>
            `${announcement.title} ${announcement.message}`
              .toLowerCase()
              .includes(normalizedSearch),
          )
          .slice(0, 5)
      : [];

  function clearGlobalSearch() {
    setGlobalSearch("");
    setSearchOpen(false);
  }

  function openAnnouncement(announcement: Announcement) {
    clearGlobalSearch();
    navigate({ to: "/dashboard", hash: `announcement-${announcement.id}` });
  }

  function openSenior(senior: ApiSenior) {
    const query = senior.osca_id_number;
    clearGlobalSearch();
    navigate({ to: "/seniors", search: { q: query, status: undefined } });
  }

  function signOut() {
    void logout().catch(() => undefined);
    clearSession();
    navigate({ to: "/login", replace: true });
  }

  function requestSignOut() {
    setProfileOpen(false);
    setMobileNavOpen(false);
    setLogoutConfirmOpen(true);
  }

  // Shared by the desktop sidebar and the mobile sheet so they stay identical.
  function renderSidebar(onNavigate?: () => void) {
    return (
      <>
        <div className="flex items-center gap-3 px-1 pr-8 lg:pr-1">
          <BrandLogo className="h-11 w-11 ring-2 ring-gold/70" />
          <div className="min-w-0">
            <p className="font-display truncate text-sm font-bold">Bulan SeniorCare</p>
            <p className="truncate text-xs text-muted-foreground">OSCA · Bulan, Sorsogon</p>
          </div>
        </div>

        <p className="mt-7 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Menu
        </p>
        <nav
          aria-label="Main navigation"
          className="mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
        >
          {visibleNav.map(({ to, label, icon: Icon }) => {
            const active = isNavActive(pathname, to);
            return (
              <Link
                key={to}
                to={to}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "bg-navy relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] dark:ring-1 dark:ring-white/15"
                    : "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                }
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute top-2 bottom-2 left-0 w-1 rounded-r-full bg-gold"
                  />
                )}
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 ${active ? "text-gold" : "transition-colors group-hover:text-foreground"}`}
                />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-border/60 pt-4">
          <div className={`${tileClass} flex items-center gap-1 p-1.5`}>
            <Link
              to="/profile"
              onClick={onNavigate}
              title={`${user?.name ?? "User"} · ${roleLabel}`}
              aria-current={pathname === "/profile" ? "page" : undefined}
              className={`flex min-w-0 flex-1 items-center gap-3 rounded-md p-1.5 transition-colors hover:bg-muted ${pathname === "/profile" ? "bg-muted" : ""}`}
            >
              <div className="bg-navy grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-bold text-white ring-2 ring-gold/50">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Profile"
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.src = defaultProfileImage;
                    }}
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user?.name ?? "User"}</p>
                <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={requestSignOut}
              aria-label="Log out"
              title="Log out"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="bg-app app-shell w-full overflow-x-clip">
      <div className="flex min-w-0 w-full gap-3 sm:gap-4 lg:gap-6">
        <aside
          className={`${panelClass} sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col p-4 lg:flex print:hidden`}
        >
          {renderSidebar()}
        </aside>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-[min(84vw,20rem)] p-4 lg:hidden">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation menu</SheetTitle>
              <SheetDescription>Open a section of Bulan SeniorCare.</SheetDescription>
            </SheetHeader>
            <div className="flex h-full flex-col">
              {renderSidebar(() => setMobileNavOpen(false))}
            </div>
          </SheetContent>
        </Sheet>

        <main className="min-w-0 flex-1">
          <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 print:hidden sm:flex sm:flex-wrap sm:gap-4">
            <button
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              title="Open navigation menu"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border/60 bg-card/90 shadow-[var(--shadow-soft)] backdrop-blur-sm transition-colors hover:bg-muted sm:h-11 sm:w-11 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <nav
              aria-label="Breadcrumb"
              className="flex h-10 w-fit min-w-0 items-center gap-1.5 rounded-lg border border-border/60 bg-card/90 shadow-[var(--shadow-soft)] backdrop-blur-sm pr-3.5 pl-1.5 text-xs leading-none sm:h-11 sm:shrink-0 sm:gap-2 sm:pr-4 sm:pl-2 sm:text-sm"
            >
              <Link
                to="/dashboard"
                aria-label="Go to dashboard"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-primary transition-colors hover:bg-muted sm:h-8 sm:w-8"
              >
                <Home className="h-4 w-4" />
              </Link>
              {breadcrumb.map((crumb, i) => {
                const destination = NAV.find((item) => item.label === crumb)?.to;
                const isCurrent = i === breadcrumb.length - 1;

                return (
                  <span
                    key={`${crumb}-${i}`}
                    className={`${isCurrent ? "flex" : "hidden sm:flex"} min-w-0 items-center gap-1.5 sm:gap-2`}
                  >
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    {destination && !isCurrent ? (
                      <Link
                        to={destination}
                        className="truncate font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {crumb}
                      </Link>
                    ) : (
                      <span
                        aria-current={isCurrent ? "page" : undefined}
                        className={`truncate ${isCurrent ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}
                      >
                        {crumb}
                      </span>
                    )}
                  </span>
                );
              })}
            </nav>
            <div
              className="relative col-span-3 row-start-2 min-w-0 sm:col-span-1 sm:row-auto sm:flex-1"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setSearchOpen(false);
                }
              }}
            >
              <Search className="pointer-events-none absolute top-1/2 left-4 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setSearchOpen(false);
                }}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={searchOpen && globalSearch.trim().length >= 2}
                aria-controls="global-search-results"
                placeholder="Search citizens, records..."
                className="h-11 w-full rounded-lg border border-border/60 bg-card/90 shadow-[var(--shadow-soft)] backdrop-blur-sm pr-4 pl-11 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/80 focus:border-ring focus:ring-4 focus:ring-ring/15"
              />
              {searchOpen && normalizedSearch.length >= 2 && (
                <div
                  id="global-search-results"
                  className="surface-card absolute top-[calc(100%+0.375rem)] right-0 left-0 z-30 max-h-[min(70vh,28rem)] overflow-y-auto border border-border/60 p-2 shadow-[var(--shadow-card)]"
                >
                  {matchingPages.length > 0 && (
                    <div>
                      <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Pages
                      </p>
                      {matchingPages.map(({ to, label, icon: Icon }) => (
                        <button
                          key={to}
                          type="button"
                          onClick={() => {
                            clearGlobalSearch();
                            navigate({ to });
                          }}
                          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold hover:bg-muted"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                  {announcementMatches.length > 0 && (
                    <div>
                      <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Announcements
                      </p>
                      {announcementMatches.map((announcement) => (
                        <button
                          key={announcement.id}
                          type="button"
                          onClick={() => openAnnouncement(announcement)}
                          className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left hover:bg-muted"
                        >
                          <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">
                              {announcement.title}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {announcement.message}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {seniorMatches.length > 0 && (
                    <div>
                      <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Senior records
                      </p>
                      {seniorMatches.map((senior) => (
                        <button
                          key={senior.id}
                          type="button"
                          onClick={() => openSenior(senior)}
                          className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left hover:bg-muted"
                        >
                          <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">
                              {[senior.first_name, senior.middle_name, senior.last_name]
                                .filter(Boolean)
                                .join(" ")}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {senior.osca_id_number}
                              {senior.barangay?.barangay_name
                                ? ` · ${senior.barangay.barangay_name}`
                                : ""}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchLoading && (
                    <p className="px-3 py-3 text-sm text-muted-foreground">Searching...</p>
                  )}
                  {!searchLoading &&
                    matchingPages.length === 0 &&
                    announcementMatches.length === 0 &&
                    seniorMatches.length === 0 && (
                      <p className="px-3 py-3 text-sm text-muted-foreground">
                        No matching pages, announcements, or senior records.
                      </p>
                    )}
                </div>
              )}
            </div>
            <div
              ref={profileMenuRef}
              className="relative col-start-3 row-start-1 flex items-center gap-1.5 sm:col-auto sm:row-auto sm:gap-3"
            >
              {!isAdmin && (
                <button
                  onClick={() => navigate({ to: "/messages" })}
                  aria-label="Open messages"
                  aria-current={isNavActive(pathname, "/messages") ? "page" : undefined}
                  title="Messages"
                  className={headerIconClass(isNavActive(pathname, "/messages"))}
                >
                  <Mail className="h-5 w-5" />
                  {unreadMessageCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[10px] leading-none font-bold text-white ring-2 ring-card">
                      {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => navigate({ to: "/notifications" })}
                aria-label="Notifications"
                aria-current={isNavActive(pathname, "/notifications") ? "page" : undefined}
                title="Notifications"
                className={headerIconClass(isNavActive(pathname, "/notifications"))}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[10px] leading-none font-bold text-white ring-2 ring-card">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setProfileOpen((open) => !open)}
                aria-label="Open profile menu"
                aria-expanded={profileOpen}
                className="bg-navy grid h-10 w-10 place-items-center overflow-hidden rounded-full text-xs font-bold text-white ring-2 ring-gold/60 transition-shadow hover:ring-gold sm:h-11 sm:w-11"
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Profile"
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.src = defaultProfileImage;
                    }}
                  />
                ) : (
                  initials
                )}
              </button>
              {profileOpen && (
                <div className="surface-card absolute top-[calc(100%+0.375rem)] right-0 z-30 w-[min(16rem,calc(100vw-1.5rem))] border border-border/60 p-2 shadow-[var(--shadow-card)]">
                  <div className="flex items-center gap-3 border-b border-border/60 px-2 pt-1 pb-3">
                    <div className="bg-navy grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-bold text-white ring-2 ring-gold/50">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.src = defaultProfileImage;
                          }}
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{user?.name ?? "User"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user?.email ?? "Admin"}
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setProfileOpen(false)}
                    aria-current={pathname === "/profile" ? "page" : undefined}
                    className={`mt-2 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold hover:bg-muted ${pathname === "/profile" ? "bg-muted" : ""}`}
                  >
                    <UserCircle className="h-4 w-4" /> My profile
                  </Link>
                  <div className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm font-semibold">
                    <span className="flex items-center gap-3">
                      <Settings className="h-4 w-4" /> Appearance
                    </span>
                    <ThemeToggle className="h-9 w-9 rounded-lg border border-border/60 shadow-none" />
                  </div>
                  <button
                    onClick={requestSignOut}
                    className="mt-1 flex w-full items-center gap-3 rounded-md border-t border-border/60 px-3 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" /> Log out
                  </button>
                </div>
              )}
            </div>
          </header>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-3 print:hidden sm:mt-6 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold sm:text-4xl dark:[text-shadow:0_2px_12px_rgb(0_0_0/0.45)]">
                {title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground dark:text-foreground/85 dark:[text-shadow:0_1px_8px_rgb(0_0_0/0.6)]">
                {subtitle}
              </p>
            </div>
            {actions}
          </div>

          <div className="page-enter mt-5 pb-10 sm:mt-6">{children}</div>
        </main>
      </div>
      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
        onConfirm={signOut}
      />
      <SessionTimeout />
    </div>
  );
}
