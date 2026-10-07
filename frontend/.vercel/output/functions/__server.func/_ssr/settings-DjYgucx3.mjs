import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { A as LockKeyhole, H as Database, I as Gift, K as ClipboardList, L as FileText, M as KeyRound, Q as ChevronRight, ct as Bell, h as ShieldCheck, p as SlidersHorizontal, st as Building2, tt as Check } from "../_libs/lucide-react.mjs";
import { t as AppShell } from "./AppShell-CSdz8EAS.mjs";
import { n as BENEFIT_PROGRAMS } from "./osca-data-CD4Joyu-.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings-DjYgucx3.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var ROLES = [
	["OSCA Administrator", "Full access to records, benefits, analytics, and user management."],
	["OSCA Head", "Reviews eligibility, approves releases, and views all analytics."],
	["BSCA / Barangay Senior Citizen Affairs", "Encodes and views records for their own barangay only."]
];
var NOTIFS = [
	[
		"Email advisories",
		"Distribution schedules and validation reminders",
		true
	],
	[
		"SMS advisories",
		"Short reminders sent to registered mobile numbers",
		true
	],
	[
		"Age threshold alerts",
		"Flags octogenarian, nonagenarian, and centenarian milestones",
		true
	],
	[
		"Weekly summary",
		"Digest of new registrations and released benefits",
		false
	]
];
var NOTIFICATION_SETTINGS_KEY = "bulan-notification-settings";
function SettingIcon({ icon: Icon }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-navy",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" })
	});
}
function SettingRow({ icon, title, description, to }) {
	const content = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingIcon, { icon }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0 flex-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-semibold",
				children: title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-0.5 text-xs text-muted-foreground",
				children: description
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-5 w-5 shrink-0 text-muted-foreground" })
	] });
	if (!to) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4",
		children: content
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
		to,
		className: "flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 hover:bg-secondary",
		children: content
	});
}
function SettingsPage() {
	const [notificationSettings, setNotificationSettings] = (0, import_react.useState)(Object.fromEntries(NOTIFS.map(([label, , enabled]) => [label, enabled])));
	(0, import_react.useEffect)(() => {
		try {
			const stored = JSON.parse(localStorage.getItem(NOTIFICATION_SETTINGS_KEY) ?? "null");
			if (stored && typeof stored === "object") setNotificationSettings((current) => ({
				...current,
				...stored
			}));
		} catch {}
	}, []);
	function toggleNotification(label) {
		setNotificationSettings((current) => {
			const next = {
				...current,
				[label]: !current[label]
			};
			localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(next));
			return next;
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Settings",
		subtitle: "Access control, notifications, and age threshold rules",
		breadcrumb: ["Dashboard", "Settings"],
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-5",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "min-w-0 space-y-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingIcon, { icon: ShieldCheck }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-lg font-bold",
							children: "System"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted-foreground",
							children: "Core access and registry configuration"
						})] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingRow, {
								icon: ShieldCheck,
								title: "User roles & access control",
								description: ROLES.map(([role]) => role).join(" · "),
								to: "/users"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingRow, {
								icon: Building2,
								title: "Barangay management",
								description: "Manage barangay scopes and registered senior coverage"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingRow, {
								icon: FileText,
								title: "Senior record settings",
								description: "Required fields, documents, and validation rules"
							})
						]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingIcon, { icon: Bell }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-lg font-bold",
							children: "Notifications"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted-foreground",
							children: "Choose which advisories appear for your account"
						})] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "surface-card divide-y divide-border px-5",
						children: NOTIFS.map(([label, desc]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-4 py-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-semibold",
									children: label
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: desc
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								role: "switch",
								"aria-checked": notificationSettings[label],
								"aria-label": `Toggle ${label}`,
								onClick: () => toggleNotification(label),
								className: `flex h-6 w-11 shrink-0 items-center rounded-full p-1 ${notificationSettings[label] ? "bg-navy" : "bg-secondary"}`,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `grid h-4 w-4 place-items-center rounded-full bg-card ${notificationSettings[label] ? "translate-x-5" : ""}`,
									children: notificationSettings[label] && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3 w-3 text-primary" })
								})
							})]
						}, label))
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingIcon, { icon: SlidersHorizontal }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-lg font-bold",
							children: "Registry & benefits"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted-foreground",
							children: "Eligibility rules and benefit program settings"
						})] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingRow, {
							icon: SlidersHorizontal,
							title: "Age threshold rules",
							description: BENEFIT_PROGRAMS.filter((program) => program.type !== "social_pension").map((program) => `${program.name}: ${program.minAge}+`).join(" · "),
							to: "/age-threshold"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingRow, {
							icon: Gift,
							title: "Benefit & assistance settings",
							description: "Programs, amounts, eligibility, and release frequency",
							to: "/benefits"
						})]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingIcon, { icon: LockKeyhole }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-lg font-bold",
							children: "Privacy & security"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted-foreground",
							children: "Account protection and system activity"
						})] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingRow, {
								icon: KeyRound,
								title: "Security settings",
								description: "Change password, two-factor authentication, and session timeout"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingRow, {
								icon: ClipboardList,
								title: "Audit logs",
								description: "Recent account, senior record, and benefit activities"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingRow, {
								icon: Database,
								title: "Data & backup",
								description: "Backup status and recovery settings"
							})
						]
					})] })
				]
			})
		})
	});
}
//#endregion
export { SettingsPage as component };
