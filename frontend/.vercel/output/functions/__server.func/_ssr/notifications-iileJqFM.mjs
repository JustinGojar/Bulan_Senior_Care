import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { E as markServerNotificationRead, f as deleteServerNotification, y as getServerNotifications } from "./router-D67W07gD.mjs";
import { ct as Bell, nt as CheckCheck, tt as Check, u as Trash2 } from "../_libs/lucide-react.mjs";
import { t as AppShell } from "./AppShell-CSdz8EAS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/notifications-iileJqFM.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Notifications() {
	const navigate = useNavigate();
	const [serverNotifications, setServerNotifications] = (0, import_react.useState)([]);
	const [selectedNotificationIds, setSelectedNotificationIds] = (0, import_react.useState)([]);
	const allSelected = serverNotifications.length > 0 && selectedNotificationIds.length === serverNotifications.length;
	function notificationTitle(notification) {
		if (notification.source_type === "benefit_release") return "Benefit release schedule";
		if (notification.source_type === "announcement") return "Announcement update";
		if (notification.message.toLowerCase().includes("comment")) return "Announcement comment";
		return "System notification";
	}
	(0, import_react.useEffect)(() => {
		getServerNotifications().then((notifications) => {
			setServerNotifications(notifications);
			setSelectedNotificationIds([]);
			const unread = notifications.filter((notification) => notification.status === "unread");
			if (unread.length === 0) return;
			return Promise.all(unread.map((notification) => markServerNotificationRead(notification.id)));
		}).then((updated) => {
			if (!updated) return;
			const updatedById = new Map(updated.map((notification) => [notification.id, notification]));
			setServerNotifications((current) => current.map((notification) => updatedById.get(notification.id) ?? notification));
			window.dispatchEvent(new Event("bulan-unread-updated"));
		}).catch(() => setServerNotifications([]));
	}, []);
	function markAllServerNotificationsRead() {
		Promise.all(serverNotifications.filter((notification) => notification.status === "unread").map((notification) => markServerNotificationRead(notification.id))).then((updated) => {
			const updatedById = new Map(updated.map((notification) => [notification.id, notification]));
			setServerNotifications((current) => current.map((notification) => updatedById.get(notification.id) ?? notification));
			window.dispatchEvent(new Event("bulan-unread-updated"));
		}).catch(() => void 0);
	}
	function deleteNotification(id) {
		deleteServerNotification(id).then(() => {
			setServerNotifications((current) => current.filter((notification) => notification.id !== id));
			setSelectedNotificationIds((current) => current.filter((selectedId) => selectedId !== id));
		}).catch(() => void 0);
	}
	function toggleSelectAll() {
		setSelectedNotificationIds(allSelected ? [] : serverNotifications.map((notification) => notification.id));
	}
	function toggleNotificationSelection(id) {
		setSelectedNotificationIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]);
	}
	function clearSelectedNotifications() {
		if (selectedNotificationIds.length === 0) return;
		Promise.all(selectedNotificationIds.map((id) => deleteServerNotification(id))).then(() => {
			const selectedIds = new Set(selectedNotificationIds);
			setServerNotifications((current) => current.filter((notification) => !selectedIds.has(notification.id)));
			setSelectedNotificationIds([]);
		}).catch(() => void 0);
	}
	function handleOpenServerNotification(notification) {
		const markRead = notification.status === "unread" ? markServerNotificationRead(notification.id).then((updated) => setServerNotifications((current) => current.map((item) => item.id === updated.id ? updated : item))).catch(() => void 0) : Promise.resolve();
		const destination = notification.source_type === "announcement" && notification.source_id ? {
			to: "/dashboard",
			hash: `announcement-${notification.source_id}`
		} : notification.source_type === "benefit_release" && notification.source_id ? {
			to: "/benefits",
			search: { release: String(notification.source_id) }
		} : { to: "/dashboard" };
		markRead.then(() => navigate(destination));
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Notifications",
		subtitle: "System alerts and operational messages",
		breadcrumb: ["Dashboard", "Notifications"],
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "surface-card p-7",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "h-4 w-4" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-bold",
						children: "Inbox"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: "Age threshold, benefit, report, and workflow notifications."
					})] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "inline-flex items-center gap-2 text-sm font-semibold",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: allSelected,
							onChange: toggleSelectAll,
							disabled: serverNotifications.length === 0,
							className: "h-4 w-4 accent-[var(--navy)]"
						}), "Select all"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap justify-end gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: markAllServerNotificationsRead,
							disabled: !serverNotifications.some((notification) => notification.status === "unread"),
							className: "inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckCheck, { className: "h-4 w-4" }), " Mark all as read"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: clearSelectedNotifications,
							disabled: selectedNotificationIds.length === 0,
							className: "inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-destructive disabled:cursor-not-allowed disabled:opacity-50",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" }),
								" Clear selected",
								selectedNotificationIds.length > 0 ? ` (${selectedNotificationIds.length})` : ""
							]
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 space-y-3",
					children: [serverNotifications.map((notification) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						onClick: () => handleOpenServerNotification(notification),
						className: `flex items-start gap-4 rounded-2xl p-5 ${notification.status === "unread" ? "bg-secondary" : "bg-secondary/60"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: selectedNotificationIds.includes(notification.id),
								onChange: () => toggleNotificationSelection(notification.id),
								onClick: (event) => event.stopPropagation(),
								"aria-label": `Select ${notificationTitle(notification)}`,
								className: "mt-2 h-4 w-4 shrink-0 accent-[var(--navy)]"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold text-gold-foreground",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "h-4 w-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "min-w-0 flex-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "block text-sm",
										children: notificationTitle(notification)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mt-1 block text-xs text-muted-foreground",
										children: notification.message
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", {
										className: "mt-2 block text-xs text-muted-foreground",
										children: new Date(notification.created_at).toLocaleDateString()
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex shrink-0 items-center gap-2",
								children: [notification.status === "unread" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: (event) => {
										event.stopPropagation();
										markServerNotificationRead(notification.id).then((updated) => setServerNotifications((current) => current.map((item) => item.id === updated.id ? updated : item))).catch(() => void 0);
									},
									className: "inline-flex items-center gap-1 rounded-full bg-card px-3 py-2 text-xs font-bold",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5" }), " Mark as read"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: (event) => {
										event.stopPropagation();
										deleteNotification(notification.id);
									},
									"aria-label": "Delete notification",
									title: "Delete notification",
									className: "grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
								})]
							})
						]
					}, `server-${notification.id}`)), serverNotifications.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "rounded-2xl bg-secondary p-8 text-center text-sm text-muted-foreground",
						children: "Your inbox is clear."
					})]
				})
			]
		})
	});
}
//#endregion
export { Notifications as component };
