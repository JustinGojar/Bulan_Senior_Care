import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as useNavigate, g as Link, l as useRouterState } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as require_jsx_runtime, d as DialogContent, f as DialogDescription, h as DialogTitle, l as Dialog, m as DialogPortal, p as DialogOverlay, u as DialogClose } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { S as getUnreadMessageSummary, _ as getRememberedUntil, b as getStoredUser, i as apiFetch, o as clearToken, r as API_URL, w as logout, y as getServerNotifications } from "./router-D67W07gD.mjs";
import { F as HandCoins, O as Mail, T as Menu, Y as CircleUser, ct as Bell, g as Settings, i as UserCog, it as ChartColumn, j as LayoutGrid, k as LogOut, n as Users, q as ClipboardCheck, t as X, v as Search } from "../_libs/lucide-react.mjs";
import { n as ThemeToggle, t as BrandLogo } from "./ThemeToggle-Bhi21hDw.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/AppShell-CSdz8EAS.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var osca_admin_default = "/assets/osca_admin-Cn9HCsAS.jpg";
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var Sheet = Dialog;
var SheetPortal = DialogPortal;
var SheetOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {
	className: cn("fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props,
	ref
}));
SheetOverlay.displayName = DialogOverlay.displayName;
var sheetVariants = cva("fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out", {
	variants: { side: {
		top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
		bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
		left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
		right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
	} },
	defaultVariants: { side: "right" }
});
var SheetContent = import_react.forwardRef(({ side = "right", className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
	ref,
	className: cn(sheetVariants({ side }), className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
		className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: "Close"
		})]
	}), children]
})] }));
SheetContent.displayName = DialogContent.displayName;
var SheetHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col space-y-2 text-center sm:text-left", className),
	...props
});
SheetHeader.displayName = "SheetHeader";
var SheetFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
SheetFooter.displayName = "SheetFooter";
var SheetTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
	ref,
	className: cn("text-lg font-semibold text-foreground", className),
	...props
}));
SheetTitle.displayName = DialogTitle.displayName;
var SheetDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
SheetDescription.displayName = DialogDescription.displayName;
var NAV = [
	{
		to: "/dashboard",
		label: "Dashboard",
		icon: LayoutGrid
	},
	{
		to: "/seniors",
		label: "Senior Record",
		icon: Users
	},
	{
		to: "/eligibility",
		label: "Eligibility Review",
		icon: ClipboardCheck
	},
	{
		to: "/age-threshold",
		label: "Age Threshold",
		icon: ClipboardCheck
	},
	{
		to: "/benefits",
		label: "Benefit Tracking",
		icon: HandCoins
	},
	{
		to: "/analytics",
		label: "Analytics",
		icon: ChartColumn
	},
	{
		to: "/users",
		label: "User Management",
		icon: UserCog
	},
	{
		to: "/settings",
		label: "Settings",
		icon: Settings
	}
];
function AppShell({ title, subtitle, breadcrumb, actions, children }) {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const navigate = useNavigate();
	const [profileOpen, setProfileOpen] = (0, import_react.useState)(false);
	const [mobileNavOpen, setMobileNavOpen] = (0, import_react.useState)(false);
	const [user, setUser] = (0, import_react.useState)(null);
	const [assignedBarangay, setAssignedBarangay] = (0, import_react.useState)("");
	const [unreadCount, setUnreadCount] = (0, import_react.useState)(0);
	const [unreadMessageCount, setUnreadMessageCount] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		setUser(getStoredUser());
		const handleUserUpdated = (event) => {
			setUser(event.detail);
		};
		window.addEventListener("bulan-user-updated", handleUserUpdated);
		return () => window.removeEventListener("bulan-user-updated", handleUserUpdated);
	}, []);
	(0, import_react.useEffect)(() => {
		const rememberedUntil = getRememberedUntil();
		if (!rememberedUntil) return;
		const checkExpiry = () => {
			if (Number(rememberedUntil) <= Date.now()) {
				clearToken();
				navigate({ to: "/login" });
			}
		};
		checkExpiry();
		const expiryTimer = window.setInterval(checkExpiry, 6e4);
		return () => window.clearInterval(expiryTimer);
	}, [navigate]);
	(0, import_react.useEffect)(() => {
		if (user?.role?.toLowerCase() !== "leader" || !user.barangay_id) {
			setAssignedBarangay("");
			return;
		}
		apiFetch("/barangays").then((barangays) => setAssignedBarangay(barangays.find((barangay) => barangay.id === user.barangay_id)?.barangay_name ?? "")).catch(() => setAssignedBarangay(""));
	}, [user?.barangay_id, user?.role]);
	(0, import_react.useEffect)(() => {
		if (user?.role?.toLowerCase() === "admin") {
			setUnreadMessageCount(0);
			return;
		}
		const updateUnreadMessageCount = () => {
			if (!user?.id) {
				setUnreadMessageCount(0);
				return;
			}
			getUnreadMessageSummary().then(({ count }) => setUnreadMessageCount(count)).catch(() => setUnreadMessageCount(0));
		};
		updateUnreadMessageCount();
		const refreshTimer = window.setInterval(updateUnreadMessageCount, 15e3);
		window.addEventListener("bulan-unread-updated", updateUnreadMessageCount);
		return () => {
			window.clearInterval(refreshTimer);
			window.removeEventListener("bulan-unread-updated", updateUnreadMessageCount);
		};
	}, [user?.id, user?.role]);
	(0, import_react.useEffect)(() => {
		const updateUnreadCount = () => {
			getServerNotifications().then((notifications) => {
				setUnreadCount(notifications.filter((item) => item.status === "unread").length);
			}).catch(() => setUnreadCount(0));
		};
		updateUnreadCount();
		const refreshTimer = window.setInterval(updateUnreadCount, 15e3);
		const handleUnreadUpdated = () => updateUnreadCount();
		window.addEventListener("bulan-unread-updated", handleUnreadUpdated);
		return () => {
			window.clearInterval(refreshTimer);
			window.removeEventListener("bulan-unread-updated", handleUnreadUpdated);
		};
	}, []);
	const initials = (user?.name ?? "User").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
	const roleLabel = user?.role?.toLowerCase() === "leader" ? `BSCA${assignedBarangay ? ` - ${assignedBarangay}` : ""}` : user?.role?.toLowerCase() === "head" ? "OSCA Head" : user?.role?.toLowerCase() === "admin" ? "OSCA Admin" : user?.role ?? "Admin";
	const isAdmin = user?.role?.toLowerCase() === "admin" || user?.roles?.some((role) => role.name.toLowerCase() === "admin");
	const photoUrl = user?.profile_photo_path ? `${API_URL.replace(/\/api$/, "")}/storage/${user.profile_photo_path}` : isAdmin ? osca_admin_default : null;
	const visibleNav = NAV.filter(({ to }) => (to !== "/users" || user?.role === "admin") && (to !== "/eligibility" || user?.role !== "leader") && (!["/analytics", "/age-threshold"].includes(to) || user?.role !== "leader"));
	async function signOut() {
		logout().catch(() => void 0);
		clearToken();
		navigate({ to: "/login" });
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "bg-app min-h-screen w-full p-3 sm:p-4 lg:p-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex w-full gap-4 lg:gap-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
					className: "surface-card sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 flex-col p-5 lg:flex print:hidden",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, { className: "h-11 w-11 ring-2 ring-gold/60" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-sm font-bold",
								children: "Bulan SeniorCare"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground",
								children: "OSCA Bulan"
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
							className: "mt-8 flex flex-col gap-1.5",
							children: visibleNav.map(({ to, label, icon: Icon }) => {
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to,
									className: pathname === to ? "bg-navy flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)]" : "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" }), label]
								}, to);
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-auto border-t border-border pt-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/profile",
								className: "flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-secondary",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "bg-navy grid h-10 w-10 shrink-0 overflow-hidden place-items-center rounded-full text-xs font-bold text-primary-foreground",
									children: photoUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: photoUrl,
										alt: "Profile",
										className: "h-full w-full object-cover",
										onError: (event) => {
											if (isAdmin) event.currentTarget.src = osca_admin_default;
										}
									}) : initials
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "truncate text-sm font-semibold",
										children: user?.name ?? "User"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "truncate text-xs text-muted-foreground",
										children: roleLabel
									})]
								})]
							})
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sheet, {
					open: mobileNavOpen,
					onOpenChange: setMobileNavOpen,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetContent, {
						side: "left",
						className: "w-[min(84vw,20rem)] p-5 lg:hidden",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex h-full flex-col",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetHeader, {
									className: "sr-only",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetTitle, { children: "Navigation menu" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetDescription, { children: "Open a section of Bulan SeniorCare." })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-3 pr-8",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, { className: "h-11 w-11 ring-2 ring-gold/60" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "font-display text-sm font-bold",
										children: "Bulan SeniorCare"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted-foreground",
										children: "OSCA Bulan"
									})] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
									className: "mt-8 flex flex-col gap-1.5",
									children: visibleNav.map(({ to, label, icon: Icon }) => {
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
											to,
											onClick: () => setMobileNavOpen(false),
											className: pathname === to ? "bg-navy flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)]" : "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" }), label]
										}, to);
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: "/profile",
									onClick: () => setMobileNavOpen(false),
									className: "mt-auto flex items-center gap-3 rounded-2xl border-t border-border p-2 pt-4 transition-colors hover:bg-secondary",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "bg-navy grid h-10 w-10 shrink-0 overflow-hidden place-items-center rounded-full text-xs font-bold text-primary-foreground",
										children: photoUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
											src: photoUrl,
											alt: "Profile",
											className: "h-full w-full object-cover",
											onError: (event) => {
												if (isAdmin) event.currentTarget.src = osca_admin_default;
											}
										}) : initials
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "truncate text-sm font-semibold",
											children: user?.name ?? "User"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "truncate text-xs text-muted-foreground",
											children: user?.role ?? "Admin"
										})]
									})]
								})
							]
						})
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
					className: "min-w-0 flex-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
							className: "flex flex-wrap items-center gap-4 print:hidden",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setMobileNavOpen(true),
									"aria-label": "Open navigation menu",
									title: "Open navigation menu",
									className: "grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card shadow-[var(--shadow-soft)] lg:hidden",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "h-5 w-5" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
									className: "hidden items-center gap-2 text-sm text-muted-foreground md:flex",
									children: breadcrumb.map((crumb, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "flex items-center gap-2",
										children: [i > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "›" }), crumb]
									}, crumb))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative min-w-0 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										placeholder: "Search citizens, records...",
										className: "h-12 w-full rounded-full bg-card pr-4 pl-11 text-sm shadow-[var(--shadow-soft)] outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative flex items-center gap-3",
									children: [
										!isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: () => navigate({ to: "/messages" }),
											"aria-label": "Open messages",
											title: "Messages",
											className: "relative grid h-11 w-11 place-items-center rounded-full bg-card shadow-[var(--shadow-soft)]",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-5 w-5" }), unreadMessageCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "absolute -top-1 -right-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white",
												children: unreadMessageCount > 99 ? "99+" : unreadMessageCount
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: () => navigate({ to: "/notifications" }),
											"aria-label": "Notifications",
											className: "relative grid h-11 w-11 place-items-center rounded-full bg-card shadow-[var(--shadow-soft)]",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "h-5 w-5" }), unreadCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "absolute -top-1 -right-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white",
												children: unreadCount > 99 ? "99+" : unreadCount
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setProfileOpen((open) => !open),
											"aria-label": "Open profile menu",
											className: "bg-navy grid h-11 w-11 overflow-hidden place-items-center rounded-full text-xs font-bold text-primary-foreground",
											children: photoUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
												src: photoUrl,
												alt: "Profile",
												className: "h-full w-full object-cover",
												onError: (event) => {
													if (isAdmin) event.currentTarget.src = osca_admin_default;
												}
											}) : initials
										}),
										profileOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "surface-card absolute top-14 right-0 z-20 w-64 p-3",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center gap-3 border-b border-border px-2 pb-3",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleUser, { className: "h-8 w-8 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "min-w-0",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
															className: "truncate text-sm font-bold",
															children: user?.name ?? "User"
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
															className: "truncate text-xs text-muted-foreground",
															children: user?.email ?? "Admin"
														})]
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
													to: "/profile",
													onClick: () => setProfileOpen(false),
													className: "mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-secondary",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleUser, { className: "h-4 w-4" }), " My profile"]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "flex items-center gap-3",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { className: "h-4 w-4" }), " Appearance"]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeToggle, { className: "h-9 w-9 shadow-none" })]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													onClick: signOut,
													className: "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "h-4 w-4" }), " Log out"]
												})
											]
										})
									]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-6 flex flex-wrap items-end justify-between gap-4 print:hidden",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
									className: "text-3xl font-extrabold sm:text-4xl",
									children: title
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-sm text-muted-foreground",
									children: subtitle
								})]
							}), actions]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-6 pb-10",
							children
						})
					]
				})
			]
		})
	});
}
//#endregion
export { cn as n, osca_admin_default as r, AppShell as t };
