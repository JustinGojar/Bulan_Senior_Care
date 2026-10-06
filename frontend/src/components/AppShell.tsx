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
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  API_URL,
  apiFetch,
  clearToken,
  getAnnouncements,
  getServerUnreadNotificationCount,
  getStoredUser,
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
import { ThemeToggle } from "./ThemeToggle";

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [assignedBarangay, setAssignedBarangay] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [globalSearch, setGlobalSearch] = useState("");
  const [seniorMatches, setSeniorMatches] = useState<ApiSenior[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    setUser(getStoredUser());
    const handleUserUpdated = (event: Event) => {
      setUser((event as CustomEvent<ApiUser>).detail);
    };
    window.addEventListener("bulan-user-updated", handleUserUpdated);
    return () => window.removeEventListener("bulan-user-updated", handleUserUpdated);
  }, []);
  useEffect(() => {
    getAnnouncements()
      .then(setAnnouncements)
      .catch(() => setAnnouncements([]));
  }, []);
  useEffect(() => {
    if (user?.role?.toLowerCase() !== "leader" || !user.barangay_id) {
      setAssignedBarangay("");
      return;
    }
    apiFetch<Array<{ id: number; barangay_name: string }>>("/barangays")
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
    const updateUnreadMessageCount = () => {
      if (!user?.id) {
        setUnreadMessageCount(0);
        return;
      }
      getUnreadMessageSummary()
        .then(({ count }) => setUnreadMessageCount(count))
        .catch(() => setUnreadMessageCount(0));
    };
    updateUnreadMessageCount();
    const refreshTimer = window.setInterval(updateUnreadMessageCount, 15000);
    window.addEventListener("bulan-unread-updated", updateUnreadMessageCount);
    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener("bulan-unread-updated", updateUnreadMessageCount);
    };
  }, [user?.id, user?.role]);
  useEffect(() => {
    const updateUnreadCount = () => {
      getServerUnreadNotificationCount()
        .then(({ count }) => setUnreadCount(count))
        .catch(() => setUnreadCount(0));
    };
    updateUnreadCount();
    const refreshTimer = window.setInterval(updateUnreadCount, 15000);
    const handleUnreadUpdated = () => updateUnreadCount();
    window.addEventListener("bulan-unread-updated", handleUnreadUpdated);
    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener("bulan-unread-updated", handleUnreadUpdated);
    };
  }, []);
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
      ? `BSCA${assignedBarangay ? ` - ${assignedBarangay}` : ""}`
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
    navigate({ to: "/seniors", search: { q: query } });
  }

  async function signOut() {
    void logout().catch(() => undefined);
    clearToken();
    navigate({ to: "/login" });
  }

  return (
    <div className="bg-app app-shell w-full">
      <div className="flex min-w-0 w-full gap-3 sm:gap-4 lg:gap-6">
        <aside className="surface-card sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col p-5 lg:flex print:hidden">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-11 w-11 ring-2 ring-gold/60" />
            <div>
              <p className="font-display text-sm font-bold">Bulan SeniorCare</p>
              <p className="text-xs text-muted-foreground">OSCA Bulan</p>
            </div>
          </div>

          <nav className="mt-8 flex flex-col gap-1.5">
            {visibleNav.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={
                    active
                      ? "bg-navy flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)]"
                      : "flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:border-[#173A52]/25 hover:bg-[#173A52]/5 hover:text-[#173A52]"
                  }
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-border pt-4">
            <Link
              to="/profile"
              className="flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 transition-all duration-200 hover:border-[#173A52]/25 hover:bg-[#173A52]/5 hover:text-[#173A52]"
            >
              <div className="bg-navy grid h-10 w-10 shrink-0 overflow-hidden place-items-center rounded-full text-xs font-bold text-primary-foreground">
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
          </div>
        </aside>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-[min(84vw,20rem)] p-5 lg:hidden">
            <div className="flex h-full flex-col">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation menu</SheetTitle>
                <SheetDescription>Open a section of Bulan SeniorCare.</SheetDescription>
              </SheetHeader>
              <div className="flex items-center gap-3 pr-8">
                <BrandLogo className="h-11 w-11 ring-2 ring-gold/60" />
                <div>
                  <p className="font-display text-sm font-bold">Bulan SeniorCare</p>
                  <p className="text-xs text-muted-foreground">OSCA Bulan</p>
                </div>
              </div>
              <nav className="mt-8 flex flex-col gap-1.5">
                {visibleNav.map(({ to, label, icon: Icon }) => {
                  const active = pathname === to;
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMobileNavOpen(false)}
                      className={
                        active
                          ? "bg-navy flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)]"
                          : "flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:border-[#173A52]/25 hover:bg-[#173A52]/5 hover:text-[#173A52]"
                      }
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-auto border-t border-border pt-4">
                <Link
                  to="/profile"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 transition-all duration-200 hover:border-[#173A52]/25 hover:bg-[#173A52]/5 hover:text-[#173A52]"
                >
                  <div className="bg-navy grid h-10 w-10 shrink-0 overflow-hidden place-items-center rounded-full text-xs font-bold text-primary-foreground">
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
                    <p className="truncate text-xs text-muted-foreground">{user?.role ?? "Admin"}</p>
                  </div>
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <main className="min-w-0 flex-1">
          <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 print:hidden sm:flex sm:flex-wrap sm:gap-4">
            <button
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              title="Open navigation menu"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card shadow-[var(--shadow-soft)] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <nav
              aria-label="Breadcrumb"
              className="flex h-11 min-w-0 shrink-0 items-center gap-2 rounded-[10px] border border-white/70 bg-white/80 px-3 text-xs shadow-[0_4px_14px_rgba(23,58,82,0.08)] backdrop-blur-sm sm:gap-3 sm:px-4 sm:text-sm"
            >
              <Link
                to="/dashboard"
                aria-label="Go to dashboard"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] text-[#173A52] transition hover:bg-[#173A52]/5"
              >
                <Home className="h-4 w-4 fill-current" />
              </Link>
              {breadcrumb.map((crumb, i) => {
                const destination = NAV.find((item) => item.label === crumb)?.to;
                const isCurrent = i === breadcrumb.length - 1;

                return (
                  <span key={`${crumb}-${i}`} className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#7EA5C5]" />
                    {destination && !isCurrent ? (
                      <Link
                        to={destination}
                        className="truncate font-medium text-[#466784] transition hover:text-[#173A52]"
                      >
                        {crumb}
                      </Link>
                    ) : (
                      <span
                        aria-current={isCurrent ? "page" : undefined}
                        className={`truncate ${isCurrent ? "font-bold text-[#173A52]" : "font-medium text-[#466784]"}`}
                      >
                        {crumb}
                      </span>
                    )}
                  </span>
                );
              })}
            </nav>
            <div
              className="relative col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:row-auto sm:flex-1"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setSearchOpen(false);
                }
              }}
            >
              <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                className="h-12 w-full rounded-[10px] bg-card pr-4 pl-11 text-sm shadow-[var(--shadow-soft)] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30"
              />
              {searchOpen && normalizedSearch.length >= 2 && (
                <div
                  id="global-search-results"
                  className="surface-card absolute top-14 right-0 left-0 z-30 max-h-[min(70vh,28rem)] overflow-y-auto p-2 shadow-xl"
                >
                  {matchingPages.length > 0 && (
                    <div>
                      <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-secondary"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                  {announcementMatches.length > 0 && (
                    <div>
                      <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Announcements
                      </p>
                      {announcementMatches.map((announcement) => (
                        <button
                          key={announcement.id}
                          type="button"
                          onClick={() => openAnnouncement(announcement)}
                          className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-secondary"
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
                      <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Senior records
                      </p>
                      {seniorMatches.map((senior) => (
                        <button
                          key={senior.id}
                          type="button"
                          onClick={() => openSenior(senior)}
                          className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-secondary"
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
            <div className="relative flex items-center gap-1.5 sm:gap-3">
              {!isAdmin && (
                <button
                  onClick={() => navigate({ to: "/messages" })}
                  aria-label="Open messages"
                  title="Messages"
                  className="relative grid h-11 w-11 place-items-center rounded-full bg-card shadow-[var(--shadow-soft)]"
                >
                  <Mail className="h-5 w-5" />
                  {unreadMessageCount > 0 && (
                    <span className="absolute -top-1 -right-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                      {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => navigate({ to: "/notifications" })}
                aria-label="Notifications"
                className="relative grid h-11 w-11 place-items-center rounded-full bg-card shadow-[var(--shadow-soft)]"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setProfileOpen((open) => !open)}
                aria-label="Open profile menu"
                className="bg-navy grid h-11 w-11 overflow-hidden place-items-center rounded-full text-xs font-bold text-primary-foreground"
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
                <div className="surface-card absolute top-14 right-0 z-20 w-64 p-3">
                  <div className="flex items-center gap-3 border-b border-border px-2 pb-3">
                    <UserCircle className="h-8 w-8 text-muted-foreground" />
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
                    className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-secondary"
                  >
                    <UserCircle className="h-4 w-4" /> My profile
                  </Link>
                  <div className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold">
                    <span className="flex items-center gap-3">
                      <Settings className="h-4 w-4" /> Appearance
                    </span>
                    <ThemeToggle className="h-9 w-9 shadow-none" />
                  </div>
                  <button
                    onClick={signOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" /> Log out
                  </button>
                </div>
              )}
            </div>
          </header>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-3 print:hidden sm:mt-6 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold sm:text-4xl">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {actions}
          </div>

          <div className="mt-6 pb-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
