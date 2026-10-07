import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { b as getStoredUser } from "./router-D67W07gD.mjs";
import { c as TriangleAlert, p as SlidersHorizontal } from "../_libs/lucide-react.mjs";
import { t as AppShell } from "./AppShell-CSdz8EAS.mjs";
import { n as BENEFIT_PROGRAMS, r as findNewEligibilityFlags } from "./osca-data-CD4Joyu-.mjs";
import { t as useSeniors } from "./use-seniors-BRd-0AsJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/age-threshold-DIXZGtuT.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AgeThresholdPage() {
	const navigate = useNavigate();
	const currentUser = getStoredUser();
	const { seniors, loading } = useSeniors({ excludePending: true });
	(0, import_react.useEffect)(() => {
		if (currentUser?.role === "leader") navigate({
			to: "/dashboard",
			replace: true
		});
	}, [currentUser?.role, navigate]);
	if (currentUser?.role === "leader") return null;
	const flags = findNewEligibilityFlags(seniors);
	const programs = BENEFIT_PROGRAMS.filter((program) => program.type !== "social_pension");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, {
		title: "Age Threshold",
		subtitle: "Review age brackets and newly eligible senior citizens",
		breadcrumb: ["Dashboard", "Age Threshold"],
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "surface-card p-7",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlidersHorizontal, { className: "h-4 w-4" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-bold",
					children: "Configured age brackets"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Current benefit thresholds used for eligibility detection."
				})] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
				children: programs.map((program) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-3xl bg-secondary p-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-display text-3xl font-extrabold",
							children: [program.minAge, "+"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm font-bold",
							children: program.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: program.maxAge ? `Eligible ages ${program.minAge}-${program.maxAge}` : "No upper age limit"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm font-semibold text-coral",
							children: program.amount
						})
					]
				}, program.type))
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "surface-card mt-6 p-7",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid h-10 w-10 place-items-center rounded-full bg-gold text-gold-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-4 w-4" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-bold",
						children: "New threshold flags"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: "Seniors who currently match a one-time age-based benefit."
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-gold-foreground",
					children: loading ? "Loading..." : `${flags.length} flags`
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3",
				children: [
					flags.map(({ senior, program, reason }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "rounded-2xl bg-secondary p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm font-bold",
									children: senior.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "shrink-0 text-xs font-bold text-gold-foreground",
									children: ["Age ", senior.age]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-xs font-semibold text-coral",
								children: program.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-xs text-muted-foreground",
								children: reason
							})
						]
					}, `${senior.id}-${program.type}`)),
					loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: "Loading senior records..."
					}),
					!loading && flags.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: "No new age threshold flags."
					})
				]
			})]
		})]
	});
}
//#endregion
export { AgeThresholdPage as component };
