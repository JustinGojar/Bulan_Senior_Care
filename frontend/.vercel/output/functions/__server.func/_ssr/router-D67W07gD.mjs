import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { A as redirect, c as HeadContent, d as createRouter, f as Outlet, g as Link, h as createRootRouteWithContext, m as createFileRoute, p as lazyRouteComponent, s as Scripts, v as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { t as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-D67W07gD.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var API_URL = "http://127.0.0.1:8000/api".replace(/\/$/, "");
var TOKEN_KEY = "bulan-api-token";
var USER_KEY = "bulan-api-user";
var REMEMBER_UNTIL_KEY = "bulan-api-remember-until";
function getToken() {
	const rememberedUntil = getRememberedUntil();
	if (rememberedUntil && Number(rememberedUntil) <= Date.now()) {
		clearToken();
		return null;
	}
	return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}
function getRememberedUntil() {
	return localStorage.getItem(REMEMBER_UNTIL_KEY);
}
function setToken(token, rememberMe) {
	localStorage.removeItem(TOKEN_KEY);
	localStorage.removeItem(USER_KEY);
	localStorage.removeItem(REMEMBER_UNTIL_KEY);
	sessionStorage.removeItem(TOKEN_KEY);
	sessionStorage.removeItem(USER_KEY);
	const storage = rememberMe ? localStorage : sessionStorage;
	storage.setItem(TOKEN_KEY, token);
	if (rememberMe) storage.setItem(REMEMBER_UNTIL_KEY, String(Date.now() + 2592e6));
}
function clearToken() {
	localStorage.removeItem(TOKEN_KEY);
	localStorage.removeItem(USER_KEY);
	localStorage.removeItem(REMEMBER_UNTIL_KEY);
	sessionStorage.removeItem(TOKEN_KEY);
	sessionStorage.removeItem(USER_KEY);
}
function broadcastAuthChange() {
	window.dispatchEvent(new CustomEvent("bulan-auth-changed"));
	if (typeof BroadcastChannel !== "undefined") {
		const channel = new BroadcastChannel("bulan-auth");
		channel.postMessage({ type: "logout" });
		channel.close();
	}
}
function getStoredUser() {
	try {
		const value = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
		return value ? JSON.parse(value) : null;
	} catch {
		return null;
	}
}
function setStoredUser(user) {
	(localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage).setItem(USER_KEY, JSON.stringify(user));
	window.dispatchEvent(new CustomEvent("bulan-user-updated", { detail: user }));
}
async function getCurrentUser() {
	const user = await apiFetch("/user");
	setStoredUser(user);
	return user;
}
async function apiFetch(path, options = {}) {
	const headers = new Headers(options.headers);
	headers.set("Accept", "application/json");
	if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
	const token = getToken();
	if (token) headers.set("Authorization", `Bearer ${token}`);
	let response;
	try {
		response = await fetch(`${API_URL}${path}`, {
			...options,
			headers
		});
	} catch {
		throw new Error(`Cannot reach the Bulan SeniorCare API at ${API_URL}. Start it with "php artisan serve" in the backend folder.`);
	}
	const body = await response.json().catch(() => null);
	if (!response.ok) {
		if (response.status === 401 && path !== "/login" && token) {
			clearToken();
			broadcastAuthChange();
			throw new Error("Your session has expired. Please log in again before saving your profile.");
		}
		const errorBody = body;
		const validation = errorBody?.errors ? Object.values(errorBody.errors).flat()[0] : void 0;
		throw new Error(validation ?? errorBody?.message ?? `Request failed (${response.status})`);
	}
	return body;
}
async function login(email, password, rememberMe) {
	const result = await apiFetch("/login", {
		method: "POST",
		body: JSON.stringify({
			email,
			password,
			remember_me: rememberMe
		})
	});
	setToken(result.token, rememberMe);
	setStoredUser(result.user);
	return result.user;
}
function requestPasswordReset(email) {
	return apiFetch("/forgot-password", {
		method: "POST",
		body: JSON.stringify({ email })
	});
}
function resetPassword(token, email, password, passwordConfirmation) {
	return apiFetch("/reset-password", {
		method: "POST",
		body: JSON.stringify({
			token,
			email,
			password,
			password_confirmation: passwordConfirmation
		})
	});
}
function bulkCreateSeniors(records) {
	return apiFetch("/seniors/bulk", {
		method: "POST",
		body: JSON.stringify({ records })
	});
}
async function createBarangayLeader(data) {
	return (await apiFetch("/admin/barangay-leaders", {
		method: "POST",
		body: JSON.stringify({
			first_name: data.firstName,
			middle_name: data.middleName || void 0,
			last_name: data.lastName,
			email: data.email,
			contact_number: data.contactNumber,
			birthdate: data.birthdate,
			barangay_id: data.barangayId,
			password: data.password,
			password_confirmation: data.passwordConfirmation
		})
	})).user;
}
function logout() {
	return apiFetch("/logout", { method: "POST" }).finally(() => {
		clearToken();
		broadcastAuthChange();
	});
}
function getManagedUsers() {
	return apiFetch("/admin/users");
}
function updateManagedUser(id, data) {
	return apiFetch(`/admin/users/${id}`, {
		method: "PUT",
		body: JSON.stringify(data)
	});
}
function deleteManagedUser(id) {
	return apiFetch(`/admin/users/${id}`, { method: "DELETE" });
}
function getAnnouncements() {
	return apiFetch("/announcements");
}
function createAnnouncement(title, message, image) {
	const body = new FormData();
	body.append("title", title);
	body.append("message", message);
	if (image) body.append("image", image);
	return apiFetch("/announcements", {
		method: "POST",
		body
	});
}
function createAnnouncementComment(announcementId, message, parentCommentId) {
	return apiFetch(`/announcements/${announcementId}/comments`, {
		method: "POST",
		body: JSON.stringify({
			message,
			parent_comment_id: parentCommentId
		})
	});
}
function getMessages(page = 1) {
	return apiFetch(`/messages?page=${page}&per_page=25`);
}
function getUnreadMessageSummary() {
	return apiFetch("/messages/unread-summary");
}
function getSeniorEditRequests() {
	return apiFetch("/senior-edit-requests");
}
function submitSeniorEditRequest(seniorId, changes) {
	return apiFetch("/senior-edit-requests", {
		method: "POST",
		body: JSON.stringify({
			senior_id: seniorId,
			changes
		})
	});
}
function reviewSeniorEditRequest(id, status) {
	return apiFetch(`/senior-edit-requests/${id}`, {
		method: "PATCH",
		body: JSON.stringify({ status })
	});
}
function getMessageRecipients(search) {
	return apiFetch(`/messages/recipients?search=${encodeURIComponent(search)}`);
}
function sendMessage(recipientId, subject, message) {
	return apiFetch("/messages", {
		method: "POST",
		body: JSON.stringify({
			recipient_id: recipientId,
			subject,
			message
		})
	});
}
function markMessageRead(id) {
	return apiFetch(`/messages/${id}/read`, { method: "POST" });
}
function deleteConversation(userId) {
	return apiFetch(`/messages/conversations/${userId}`, { method: "DELETE" });
}
function getServerNotifications() {
	return apiFetch("/notifications");
}
function markServerNotificationRead(id) {
	return apiFetch(`/notifications/${id}/read`, { method: "POST" });
}
function deleteServerNotification(id) {
	return apiFetch(`/notifications/${id}`, { method: "DELETE" });
}
var Toaster$1 = ({ ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	});
};
var logo_default = "/assets/logo-DScc73ha.png";
var styles_default = "/assets/styles-4-eADipd.css";
var PUBLIC_PATHS = /* @__PURE__ */ new Set([
	"/",
	"/login",
	"/forgot-password",
	"/reset-password"
]);
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$17 = createRootRouteWithContext()({
	beforeLoad: async ({ location }) => {
		if (typeof window === "undefined") return;
		const roleRequirements = {
			"/users": ["admin"],
			"/eligibility": ["admin", "head"],
			"/reports": ["admin", "head"],
			"/analytics": ["admin", "head"],
			"/age-threshold": ["admin", "head"]
		};
		const isPublic = PUBLIC_PATHS.has(location.pathname);
		if (!getToken()) {
			if (!isPublic) throw redirect({ to: "/login" });
			return;
		}
		let user;
		try {
			user = await getCurrentUser();
		} catch {
			clearToken();
			if (isPublic) return;
			broadcastAuthChange();
			throw redirect({ to: "/login" });
		}
		if (location.pathname === "/login") throw redirect({ to: "/dashboard" });
		const allowedRoles = roleRequirements[location.pathname];
		const role = user.role.toLowerCase();
		if (allowedRoles && !allowedRoles.includes(role)) throw redirect({ to: "/unauthorized" });
	},
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "Objective Weaver" },
			{
				name: "description",
				content: "Objective tracking and management"
			},
			{
				name: "author",
				content: "Objective Weaver"
			},
			{
				property: "og:title",
				content: "Objective Weaver"
			},
			{
				property: "og:description",
				content: "Objective tracking and management"
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			}
		],
		links: [
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "icon",
				href: logo_default,
				type: "image/png"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$17.useRouteContext();
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		const handleAuthChange = () => {
			clearToken();
			if (PUBLIC_PATHS.has(router.state.location.pathname)) return;
			router.navigate({
				to: "/login",
				replace: true
			});
		};
		const handleStorageChange = (event) => {
			if (event.key === "bulan-api-token" && event.newValue === null) handleAuthChange();
		};
		const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("bulan-auth") : null;
		channel?.addEventListener("message", handleAuthChange);
		window.addEventListener("bulan-auth-changed", handleAuthChange);
		window.addEventListener("storage", handleStorageChange);
		return () => {
			channel?.close();
			window.removeEventListener("bulan-auth-changed", handleAuthChange);
			window.removeEventListener("storage", handleStorageChange);
		};
	}, [router]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(QueryClientProvider, {
		client: queryClient,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster$1, {
			richColors: true,
			position: "top-right"
		})]
	});
}
var $$splitComponentImporter$16 = () => import("./routes-CfX4wpYW.mjs");
var Route$16 = createFileRoute("/")({
	head: () => ({ meta: [
		{ title: "Bulan SeniorCare — OSCA Senior Profiling & Benefit Portal" },
		{
			name: "description",
			content: "Web-based senior citizen profiling and benefit monitoring system with descriptive analytics for the Office of Senior Citizen Affairs of LGU-Bulan, Sorsogon."
		},
		{
			property: "og:title",
			content: "Bulan SeniorCare — OSCA Portal"
		},
		{
			property: "og:description",
			content: "Registration, eligibility verification, benefit tracking, and barangay-level analytics for OSCA Bulan."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary_large_image"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$16, "component")
});
var $$splitComponentImporter$15 = () => import("./age-threshold-DIXZGtuT.mjs");
var Route$15 = createFileRoute("/age-threshold")({
	head: () => ({ meta: [{ title: "Age Threshold — Bulan SeniorCare" }] }),
	component: lazyRouteComponent($$splitComponentImporter$15, "component")
});
var $$splitComponentImporter$14 = () => import("./analytics-kaGKmx_G.mjs");
var Route$14 = createFileRoute("/analytics")({
	head: () => ({ meta: [
		{ title: "Descriptive Analytics — Bulan SeniorCare" },
		{
			name: "description",
			content: "Descriptive analytics across barangays, age groups, and Expanded Centenarian programs for senior citizens of Bulan, Sorsogon."
		},
		{
			property: "og:title",
			content: "Descriptive Analytics — Bulan SeniorCare"
		},
		{
			property: "og:description",
			content: "Barangay-level and municipal-level summaries of registrations and benefits."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary_large_image"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$14, "component")
});
var $$splitComponentImporter$13 = () => import("./benefits-DZdNSv80.mjs");
var Route$13 = createFileRoute("/benefits")({
	head: () => ({ meta: [{ title: "Benefit Tracking — Bulan SeniorCare" }] }),
	component: lazyRouteComponent($$splitComponentImporter$13, "component")
});
var $$splitComponentImporter$12 = () => import("./dashboard-C3Z0jCmH.mjs");
var Route$12 = createFileRoute("/dashboard")({
	head: () => ({ meta: [
		{ title: "System Dashboard — Bulan SeniorCare" },
		{
			name: "description",
			content: "Overview of OSCA Bulan operations: registered seniors, benefits distributed, pending applications, and distribution status."
		},
		{
			property: "og:title",
			content: "System Dashboard — Bulan SeniorCare"
		},
		{
			property: "og:description",
			content: "Live overview of senior citizen registrations and benefit distribution in Bulan."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary_large_image"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$12, "component")
});
var $$splitComponentImporter$11 = () => import("./eligibility-DkZ2zBVn.mjs");
var Route$11 = createFileRoute("/eligibility")({
	head: () => ({ meta: [{ title: "Eligibility Review — Bulan SeniorCare" }] }),
	component: lazyRouteComponent($$splitComponentImporter$11, "component")
});
var $$splitComponentImporter$10 = () => import("./forgot-password-Baf7NoeK.mjs");
var Route$10 = createFileRoute("/forgot-password")({
	head: () => ({ meta: [{ title: "Forgot Password - Bulan SeniorCare" }] }),
	component: lazyRouteComponent($$splitComponentImporter$10, "component")
});
var $$splitComponentImporter$9 = () => import("./login-DTGSDTM7.mjs");
var Route$9 = createFileRoute("/login")({
	head: () => ({ meta: [
		{ title: "Log In — Bulan SeniorCare OSCA Portal" },
		{
			name: "description",
			content: "Sign in to the Bulan SeniorCare portal to manage senior citizen profiles, benefits, and analytics for OSCA Bulan."
		},
		{
			property: "og:title",
			content: "Log In — Bulan SeniorCare"
		},
		{
			property: "og:description",
			content: "Role-based access for OSCA admins, heads, and barangay leaders."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary_large_image"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
var $$splitComponentImporter$8 = () => import("./messages-CSAYpBWr.mjs");
var Route$8 = createFileRoute("/messages")({
	head: () => ({ meta: [{ title: "Inbox — Bulan SeniorCare" }] }),
	component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
var $$splitComponentImporter$7 = () => import("./notifications-iileJqFM.mjs");
var Route$7 = createFileRoute("/notifications")({
	head: () => ({ meta: [{ title: "Notifications — Bulan SeniorCare" }] }),
	component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
var $$splitComponentImporter$6 = () => import("./profile-WCCaEGjm.mjs");
var Route$6 = createFileRoute("/profile")({
	head: () => ({ meta: [{ title: "My Profile — Bulan SeniorCare" }] }),
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
var $$splitComponentImporter$5 = () => import("./reports-BISSKoOf.mjs");
var Route$5 = createFileRoute("/reports")({
	head: () => ({ meta: [{ title: "Reports — Bulan SeniorCare" }] }),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var $$splitComponentImporter$4 = () => import("./reset-password-DcN8ltWG.mjs");
var Route$4 = createFileRoute("/reset-password")({
	head: () => ({ meta: [{ title: "Reset Password - Bulan SeniorCare" }] }),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
var $$splitComponentImporter$3 = () => import("./seniors-DZgmq6-b.mjs");
var Route$3 = createFileRoute("/seniors")({
	head: () => ({ meta: [
		{ title: "Senior Records — Bulan SeniorCare" },
		{
			name: "description",
			content: "Manage all registered senior citizens of Bulan: profiles, OSCA IDs, barangay, benefits, and eligibility status."
		},
		{
			property: "og:title",
			content: "Senior Records — Bulan SeniorCare"
		},
		{
			property: "og:description",
			content: "Search, filter, and manage every registered senior citizen record in Bulan."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary_large_image"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./settings-DjYgucx3.mjs");
var Route$2 = createFileRoute("/settings")({
	head: () => ({ meta: [
		{ title: "Settings — Bulan SeniorCare" },
		{
			name: "description",
			content: "Configure roles and access levels, notification channels, and age threshold rules for the OSCA Bulan portal."
		},
		{
			property: "og:title",
			content: "Settings — Bulan SeniorCare"
		},
		{
			property: "og:description",
			content: "Access control, notifications, and age threshold configuration for OSCA Bulan."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary_large_image"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./unauthorized-nvoL0a5M.mjs");
var Route$1 = createFileRoute("/unauthorized")({
	head: () => ({ meta: [{ title: "Unauthorized — Bulan SeniorCare" }] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./users-BDW-cc4K.mjs");
var Route = createFileRoute("/users")({
	head: () => ({ meta: [{ title: "User Management — Bulan SeniorCare" }] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var rootRouteChildren = {
	IndexRoute: Route$16.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$17
	}),
	AgeThresholdRoute: Route$15.update({
		id: "/age-threshold",
		path: "/age-threshold",
		getParentRoute: () => Route$17
	}),
	AnalyticsRoute: Route$14.update({
		id: "/analytics",
		path: "/analytics",
		getParentRoute: () => Route$17
	}),
	BenefitsRoute: Route$13.update({
		id: "/benefits",
		path: "/benefits",
		getParentRoute: () => Route$17
	}),
	DashboardRoute: Route$12.update({
		id: "/dashboard",
		path: "/dashboard",
		getParentRoute: () => Route$17
	}),
	EligibilityRoute: Route$11.update({
		id: "/eligibility",
		path: "/eligibility",
		getParentRoute: () => Route$17
	}),
	ForgotPasswordRoute: Route$10.update({
		id: "/forgot-password",
		path: "/forgot-password",
		getParentRoute: () => Route$17
	}),
	LoginRoute: Route$9.update({
		id: "/login",
		path: "/login",
		getParentRoute: () => Route$17
	}),
	MessagesRoute: Route$8.update({
		id: "/messages",
		path: "/messages",
		getParentRoute: () => Route$17
	}),
	NotificationsRoute: Route$7.update({
		id: "/notifications",
		path: "/notifications",
		getParentRoute: () => Route$17
	}),
	ProfileRoute: Route$6.update({
		id: "/profile",
		path: "/profile",
		getParentRoute: () => Route$17
	}),
	ReportsRoute: Route$5.update({
		id: "/reports",
		path: "/reports",
		getParentRoute: () => Route$17
	}),
	ResetPasswordRoute: Route$4.update({
		id: "/reset-password",
		path: "/reset-password",
		getParentRoute: () => Route$17
	}),
	SeniorsRoute: Route$3.update({
		id: "/seniors",
		path: "/seniors",
		getParentRoute: () => Route$17
	}),
	SettingsRoute: Route$2.update({
		id: "/settings",
		path: "/settings",
		getParentRoute: () => Route$17
	}),
	UnauthorizedRoute: Route$1.update({
		id: "/unauthorized",
		path: "/unauthorized",
		getParentRoute: () => Route$17
	}),
	UsersRoute: Route.update({
		id: "/users",
		path: "/users",
		getParentRoute: () => Route$17
	})
};
var routeTree = Route$17._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
var getRouter = () => {
	const queryClient = new QueryClient();
	return createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { sendMessage as A, login as C, requestPasswordReset as D, markServerNotificationRead as E, submitSeniorEditRequest as M, updateManagedUser as N, resetPassword as O, getUnreadMessageSummary as S, markMessageRead as T, getRememberedUntil as _, bulkCreateSeniors as a, getStoredUser as b, createAnnouncementComment as c, deleteManagedUser as d, deleteServerNotification as f, getMessages as g, getMessageRecipients as h, apiFetch as i, setStoredUser as j, reviewSeniorEditRequest as k, createBarangayLeader as l, getManagedUsers as m, logo_default as n, clearToken as o, getAnnouncements as p, API_URL as r, createAnnouncement as s, router_exports as t, deleteConversation as u, getSeniorEditRequests as v, logout as w, getToken as x, getServerNotifications as y };
