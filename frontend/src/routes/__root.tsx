import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  redirect,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import {
  API_URL,
  broadcastAuthChange,
  clearToken,
  getToken,
  noteSessionEnded,
  setStoredUser,
  type ApiUser,
} from "@/lib/api";
import { THEME_KEY } from "@/lib/theme";
import { NavigationProgress } from "@/components/NavigationProgress";
import { StatusPage } from "@/components/StatusPage";
import { primaryButtonClass, secondaryButtonClass } from "@/components/design-kit";
import { Home, LayoutGrid, MapPinOff, RotateCw, TriangleAlert } from "lucide-react";

import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import logo from "@/images/logo.png";
import appCss from "../styles.css?url";

const PUBLIC_PATHS = new Set(["/", "/login", "/forgot-password", "/reset-password"]);
const CURRENT_USER_CACHE_DURATION = 60_000;

let cachedCurrentUser: { token: string; user: ApiUser; expiresAt: number } | null = null;
const currentUserRequests = new Map<string, Promise<ApiUser>>();

async function requestCurrentUser(token: string) {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/user`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error(
      `The browser could not complete a request to the Bulan SeniorCare API at ${API_URL}. Check the network connection and confirm the application server is available.`,
    );
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const errorBody = body as { message?: string; errors?: Record<string, string[]> } | null;
    const validation = errorBody?.errors ? Object.values(errorBody.errors).flat()[0] : undefined;
    const error = new Error(
      validation ?? errorBody?.message ?? `Request failed (${response.status})`,
    );
    Object.assign(error, { status: response.status });
    throw error;
  }
  // The body can be missing when the request is cancelled mid-response (e.g. a page reload).
  if (!body) throw new Error("The session check returned no user.");
  return body as ApiUser;
}

function loadCurrentUser(token: string) {
  if (cachedCurrentUser?.token === token && cachedCurrentUser.expiresAt > Date.now()) {
    return Promise.resolve(cachedCurrentUser.user);
  }

  const existingRequest = currentUserRequests.get(token);
  if (existingRequest) return existingRequest;

  const promise = requestCurrentUser(token)
    .then((user) => {
      if (getToken() !== token) {
        throw new Error("Authentication changed while validating the session.");
      }

      setStoredUser(user);
      cachedCurrentUser = {
        token,
        user,
        expiresAt: Date.now() + CURRENT_USER_CACHE_DURATION,
      };
      return user;
    })
    .finally(() => {
      if (currentUserRequests.get(token) === promise) currentUserRequests.delete(token);
    });
  currentUserRequests.set(token, promise);
  return promise;
}

function NotFoundComponent() {
  return (
    <StatusPage
      icon={MapPinOff}
      tone="gold"
      code="404"
      title="Page not found"
      actions={
        <>
          <Link to="/dashboard" className={primaryButtonClass}>
            <LayoutGrid className="h-4 w-4" />
            Go to dashboard
          </Link>
          <Link to="/" className={secondaryButtonClass}>
            <Home className="h-4 w-4" />
            Home page
          </Link>
        </>
      }
    >
      The page you&apos;re looking for doesn&apos;t exist or has been moved. Check the address, or
      head back to a page you know.
    </StatusPage>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <StatusPage
      icon={TriangleAlert}
      tone="danger"
      title="This page didn't load"
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className={primaryButtonClass}
          >
            <RotateCw className="h-4 w-4" />
            Try again
          </button>
          <a href="/" className={secondaryButtonClass}>
            <Home className="h-4 w-4" />
            Home page
          </a>
        </>
      }
    >
      Something went wrong on our end. Check your internet connection and try again, or head back
      home.
    </StatusPage>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;

    const roleRequirements: Record<string, string[]> = {
      "/users": ["admin"],
      "/eligibility": ["admin", "head"],
      "/reports": ["admin", "head"],
      "/analytics": ["admin", "head", "leader"],
      "/age-threshold": ["admin", "head"],
    };
    const isPublic = PUBLIC_PATHS.has(location.pathname);
    const token = getToken();

    if (!token) {
      cachedCurrentUser = null;
      if (!isPublic) throw redirect({ to: "/login" });
      return;
    }

    let user: ApiUser;
    while (true) {
      const token = getToken();
      if (!token) {
        cachedCurrentUser = null;
        if (!isPublic) throw redirect({ to: "/login" });
        return;
      }

      try {
        user = await loadCurrentUser(token);
      } catch (error) {
        if (getToken() !== token) continue;

        if (cachedCurrentUser?.token === token) cachedCurrentUser = null;
        const wasUnauthorized = error instanceof Error && "status" in error && error.status === 401;
        // Only a 401 means the session is gone. Network failures, server errors and
        // requests cancelled by a page reload must not sign the user out.
        if (!wasUnauthorized) {
          if (isPublic) return;
          throw error;
        }
        noteSessionEnded(error.message);
        clearToken();
        broadcastAuthChange();
        if (isPublic) return;
        throw redirect({ to: "/login" });
      }

      if (getToken() === token) break;
    }

    if (location.pathname === "/login") {
      throw redirect({ to: "/dashboard" });
    }

    const allowedRoles = roleRequirements[location.pathname];
    const role = user.role.toLowerCase();
    if (allowedRoles && !allowedRoles.includes(role)) {
      throw redirect({ to: "/unauthorized" });
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Objective Weaver" },
      { name: "description", content: "Objective tracking and management" },
      { name: "author", content: "Objective Weaver" },
      { property: "og:title", content: "Objective Weaver" },
      { property: "og:description", content: "Objective tracking and management" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: logo, type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

// Applies the saved theme before first paint, so pages load in dark mode without a light flash.
const themeScript = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)})==="dark"?"dark":"light";document.documentElement.classList.toggle("dark",t==="dark");document.documentElement.style.colorScheme=t}catch(e){}`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    // On a full page load the root beforeLoad runs on the server, where it cannot see the
    // stored token, and hydration does not run it again. Re-run it here so a signed-out
    // visitor (a typed URL, a reload, or the back button after logout) is sent to login.
    void router.invalidate();
  }, [router]);

  useEffect(() => {
    const handleAuthChange = () => {
      clearToken();
      if (PUBLIC_PATHS.has(router.state.location.pathname)) return;
      void router.navigate({ to: "/login", replace: true });
    };
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "bulan-api-token" && event.newValue === null) handleAuthChange();
    };
    // The back-forward cache can restore a snapshot of an account page after logout;
    // send that snapshot to the login page instead of showing it.
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && !getToken()) handleAuthChange();
    };
    const channel =
      typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("bulan-auth") : null;
    channel?.addEventListener("message", handleAuthChange);
    window.addEventListener("bulan-auth-changed", handleAuthChange);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      channel?.close();
      window.removeEventListener("bulan-auth-changed", handleAuthChange);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [router]);

  useEffect(() => {
    // After a deploy, a page opened earlier still points at the old build's lazily loaded
    // files (PDF and spreadsheet libraries, page code), which no longer exist on the server.
    const handlePreloadError = () => {
      toast.error("A new version of Bulan SeniorCare is available.", {
        id: "app-updated",
        description: "Reload the page, then try again.",
        duration: Infinity,
        action: { label: "Reload", onClick: () => window.location.reload() },
      });
    };
    window.addEventListener("vite:preloadError", handlePreloadError);
    return () => window.removeEventListener("vite:preloadError", handlePreloadError);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <NavigationProgress />
      <Outlet />
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
