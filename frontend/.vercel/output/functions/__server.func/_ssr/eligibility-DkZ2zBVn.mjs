import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { b as getStoredUser, r as API_URL } from "./router-D67W07gD.mjs";
import { R as Eye, q as ClipboardCheck } from "../_libs/lucide-react.mjs";
import { t as AppShell } from "./AppShell-CSdz8EAS.mjs";
import { t as useSeniors } from "./use-seniors-BRd-0AsJ.mjs";
import { a as DialogHeader, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-CeycyYL_.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/eligibility-DkZ2zBVn.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function isImageDocument(path) {
	return /\.(jpe?g|png|webp)$/i.test(path);
}
function EligibilityReview() {
	const navigate = useNavigate();
	const currentUser = getStoredUser();
	const { seniors, updateSenior } = useSeniors({ pendingOnly: true });
	const pendingSeniors = seniors;
	const [viewing, setViewing] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (!["admin", "head"].includes(currentUser?.role ?? "")) navigate({
			to: "/dashboard",
			replace: true
		});
	}, [currentUser?.role, navigate]);
	if (!["admin", "head"].includes(currentUser?.role ?? "")) return null;
	async function reviewSenior(senior, status) {
		try {
			await updateSenior(senior.id, {
				...senior,
				status
			});
			toast.success(`${senior.name} marked ${status === "Active" ? "eligible" : "not eligible"}.`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Could not update eligibility.");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, {
		title: "Eligibility Review",
		subtitle: "Verify age-threshold flags before enrollment",
		breadcrumb: ["Dashboard", "Eligibility Review"],
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "surface-card p-7",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClipboardCheck, { className: "h-4 w-4" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-bold",
					children: "Pending senior registrations"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Admin review is required before a one-time grant is recorded."
				})] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 space-y-3",
				children: [pendingSeniors.map((senior) => {
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-secondary p-5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-bold",
								children: [
									senior.name,
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "ml-2 text-xs font-semibold text-muted-foreground",
										children: senior.id
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-sm text-coral",
								children: [
									"Age ",
									senior.age,
									" · ",
									senior.barangay
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-xs text-muted-foreground",
								children: "Review this registration before it becomes an active record."
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setViewing(senior),
								"aria-label": `View full information for ${senior.name}`,
								className: "inline-flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-sm font-semibold",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-4 w-4" }), " View"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => reviewSenior(senior, "Inactive"),
									className: "rounded-full bg-card px-4 py-2.5 text-sm font-semibold text-destructive",
									children: "Not eligible"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => reviewSenior(senior, "Active"),
									className: "bg-navy rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground",
									children: "Eligible"
								})]
							})]
						})]
					}, senior.id);
				}), pendingSeniors.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "No pending registrations to review."
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
			open: !!viewing,
			onOpenChange: (open) => !open && setViewing(null),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
				className: "sm:max-w-lg",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
						className: "font-display",
						children: viewing?.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Full senior citizen information" })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
						className: "grid grid-cols-2 gap-4 text-sm",
						children: [
							["Senior ID", viewing?.id],
							["Name", viewing?.name],
							["Age", viewing?.age],
							["Barangay", viewing?.barangay],
							["Contact", viewing?.contact],
							["Benefit", viewing?.benefit],
							["Status", viewing?.status]
						].map(([label, value]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-muted-foreground",
							children: label
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "mt-1 font-semibold",
							children: value
						})] }, String(label)))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-5 border-t border-border pt-5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-bold",
							children: "Supporting Documents"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3 grid grid-cols-2 gap-4",
							children: [["Valid ID", viewing?.validIdPath ?? viewing?.idDocumentPath], ["Birth Certificate", viewing?.birthCertificatePath]].map(([label, path]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: label
								}), path ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: `${API_URL.replace(/\/api$/, "")}/storage/${path}`,
									target: "_blank",
									rel: "noreferrer",
									className: "mt-2 block text-sm font-semibold",
									children: isImageDocument(path) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: `${API_URL.replace(/\/api$/, "")}/storage/${path}`,
										alt: label,
										className: "h-24 w-full rounded-xl border border-border object-cover"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block rounded-xl bg-secondary px-3 py-4 text-center",
										children: "Open document"
									})
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "mt-2 block rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground",
									children: "Not uploaded"
								})]
							}, label))
						})]
					})
				]
			})
		})]
	});
}
//#endregion
export { EligibilityReview as component };
