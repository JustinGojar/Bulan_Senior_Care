import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { F as HandCoins, K as ClipboardList, ct as Bell, h as ShieldCheck, it as ChartColumn, lt as BadgeCheck, ut as ArrowRight } from "../_libs/lucide-react.mjs";
import { n as ThemeToggle, t as BrandLogo } from "./ThemeToggle-Bhi21hDw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CfX4wpYW.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var img_default = "/assets/img-D64rap2-.png";
var NAV = [
	"About",
	"Features",
	"Benefits",
	"Analytics",
	"FAQ"
];
var FEATURES = [
	{
		icon: ClipboardList,
		title: "Senior Citizen Registration",
		body: "Encode profiles, addresses, and supporting documents digitally — no more lost or unreadable paper folders."
	},
	{
		icon: BadgeCheck,
		title: "Eligibility Verification",
		body: "Validate qualifications against OSCA rules before a beneficiary is endorsed for any program."
	},
	{
		icon: HandCoins,
		title: "Benefit Tracking",
		body: "Know exactly which benefit each senior already received, and what is still pending release."
	},
	{
		icon: ChartColumn,
		title: "Reports and Analytics",
		body: "Descriptive charts for registrations, distribution status, and barangay to municipal summaries."
	},
	{
		icon: ShieldCheck,
		title: "Roles and Access Control",
		body: "Three access levels — admin, OSCA head, and barangay leader — each seeing only what they should."
	},
	{
		icon: Bell,
		title: "Notifications & Age Thresholds",
		body: "Email and SMS advisories, plus automatic detection of octogenarian, nonagenarian, and centenarian milestones."
	}
];
var ANALYTICS = [
	"Total number of registered senior citizens",
	"Benefit distribution status",
	"Barangay-level summary",
	"Municipal-level summary"
];
function Landing() {
	(0, import_react.useEffect)(() => {
		let fallbackTimer;
		let waitingForScroll = false;
		const cardsBySection = {
			about: "#about",
			features: "#features .surface-card",
			benefits: "#benefits > .surface-card:first-child",
			analytics: "#analytics",
			faq: "#faq .surface-card"
		};
		const popTargetCards = () => {
			if (!waitingForScroll) return;
			window.clearTimeout(fallbackTimer);
			document.querySelectorAll(".landing-scroll-pop").forEach((card) => {
				card.classList.remove("landing-scroll-pop");
			});
			const selector = cardsBySection[window.location.hash.slice(1)];
			if (selector) document.querySelectorAll(selector).forEach((card) => {
				card.offsetWidth;
				card.classList.add("landing-scroll-pop");
			});
			waitingForScroll = false;
		};
		const scheduleFallback = () => {
			if (!waitingForScroll) return;
			window.clearTimeout(fallbackTimer);
			fallbackTimer = window.setTimeout(popTargetCards, 120);
		};
		const beginNavigation = () => {
			waitingForScroll = true;
			scheduleFallback();
		};
		const handleAnchorClick = (event) => {
			if (event.target instanceof Element && event.target.closest("a[href^=\"#\"]")) beginNavigation();
		};
		window.addEventListener("hashchange", beginNavigation);
		window.addEventListener("scroll", scheduleFallback, { passive: true });
		window.addEventListener("scrollend", popTargetCards);
		document.addEventListener("click", handleAnchorClick);
		return () => {
			window.clearTimeout(fallbackTimer);
			window.removeEventListener("hashchange", beginNavigation);
			window.removeEventListener("scroll", scheduleFallback);
			window.removeEventListener("scrollend", popTargetCards);
			document.removeEventListener("click", handleAnchorClick);
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "bg-app landing-page-bg min-h-screen",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-screen-2xl px-10 py-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "surface-card sticky top-3 z-50 flex items-center justify-between gap-6 border border-border/70 bg-secondary/78 px-6 py-3 backdrop-blur-xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex shrink-0 items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, { className: "h-10 w-10 ring-2 ring-gold/60" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-sm font-bold",
								children: "Bulan SeniorCare"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground",
								children: "Bulan, Sorsogon"
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
							className: "hidden flex-1 items-center justify-center gap-20 text-sm font-semibold text-muted-foreground lg:flex",
							children: NAV.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: `#${item.toLowerCase()}`,
								className: "relative isolate rounded-xl px-3 py-2 transition-colors hover:text-foreground before:absolute before:inset-y-0 before:-inset-x-3 before:-z-10 before:rounded-xl before:bg-black/10 before:opacity-0 before:transition-opacity before:content-[''] hover:before:opacity-100 focus-visible:before:opacity-100",
								children: item
							}, item))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex shrink-0 items-center gap-8",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeToggle, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/login",
								className: "rounded-full bg-card px-5 py-2.5 text-sm font-semibold shadow-[var(--shadow-soft)]",
								children: "Login"
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "grid items-center gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "inline-flex items-center rounded-full bg-card px-4 py-2 text-xs font-semibold shadow-[var(--shadow-soft)]",
							children: "Office for Senior Citizens Affairs"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
							className: "mt-6 text-6xl leading-[1.03] font-extrabold",
							children: [
								"Caring for every ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-coral",
									children: "Lolo"
								}),
								" and",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-coral",
									children: "Lola"
								}),
								" in Bulan"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display mt-5 text-xl text-foreground/85 dark:text-white",
							children: "Profile. Monitor. Serve better."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-5 max-w-xl text-sm leading-relaxed text-foreground/80 dark:text-white",
							children: "The Bulan SeniorCare Portal replaces paper-based OSCA records with a single, secure system for registration, eligibility, benefits, and reporting — built for the Office of Senior Citizen Affairs and every barangay leader in the municipality."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-9 flex flex-wrap gap-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/login",
								className: "bg-navy inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)] dark:text-white",
								children: ["Get Started ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-4 w-4" })]
							})
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative mx-auto w-full max-w-xl px-2 py-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								"aria-hidden": "true",
								className: "absolute inset-4 rotate-[-6deg] border-[10px] border-white bg-white shadow-[var(--shadow-card)]"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								"aria-hidden": "true",
								className: "absolute inset-4 rotate-[5deg] border-[10px] border-white bg-white shadow-[var(--shadow-card)]"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("figure", {
								className: "relative z-10 rotate-[-1deg] border-[10px] border-white bg-white shadow-[var(--shadow-card)]",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: img_default,
									alt: "Senior citizens gathered outdoors in Bulan",
									className: "block aspect-[1.7] w-full object-cover"
								})
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					id: "about",
					className: "surface-card scroll-mt-24 p-10",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-full bg-secondary px-4 py-1.5 text-xs font-semibold",
							children: "About OSCA Bulan"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-5 max-w-3xl text-3xl font-extrabold",
							children: "A centralized record for a growing senior population"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground",
							children: "Republic Act No. 9994 requires every municipality to run an Office for Senior Citizens Affairs. In Bulan, that office still relies on folders and spreadsheets, so retrieving and updating a record takes time and benefit histories are hard to trace. This portal digitizes profiling, eligibility, and benefit monitoring so staff spend their time serving seniors instead of searching for paper."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-8 grid gap-5 sm:grid-cols-3",
							children: [
								["Objective 1", "Determine the information requirements: profiling, beneficiary qualification, and the existing OSCA workflow."],
								["Objective 2", "Implement registration, eligibility, benefit tracking, reports, access control, notifications, and age thresholds."],
								["Objective 3", "Integrate descriptive analytics at both barangay and municipal level."]
							].map(([tag, body]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-3xl bg-secondary p-6",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-bold text-gold-foreground dark:text-white",
									children: tag
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 text-sm text-muted-foreground",
									children: body
								})]
							}, tag))
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					id: "features",
					className: "scroll-mt-24 py-20",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-3xl font-extrabold",
							children: "System features"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted-foreground",
							children: "The seven modules defined in the study objectives."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3",
							children: FEATURES.map(({ icon: Icon, title, body }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								className: "surface-card p-7",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "bg-navy grid h-11 w-11 place-items-center rounded-2xl text-primary-foreground",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "mt-5 text-lg font-bold",
										children: title
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-2 text-sm leading-relaxed text-muted-foreground",
										children: body
									})
								]
							}, title))
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					id: "benefits",
					className: "scroll-mt-24 grid gap-6 lg:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "surface-card p-10",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-3xl font-extrabold",
							children: "Who benefits"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-6 space-y-5 text-sm",
							children: [
								["OSCA Staff", "Register seniors, update details, track distribution, and generate accurate reports."],
								["Senior Citizens", "Receive the right benefits on time, with a clear view of their own status."],
								["LGU-Bulan", "Better data for planning and decision-making on senior welfare programs."]
							].map(([who, why]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex gap-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BadgeCheck, { className: "mt-0.5 h-5 w-5 shrink-0 text-gold" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-bold",
									children: [who, ". "]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted-foreground",
									children: why
								})] })]
							}, who))
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						id: "analytics",
						className: "surface-card scroll-mt-24 p-10",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-3xl font-extrabold",
							children: "Descriptive analytics"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-6 grid gap-3",
							children: ANALYTICS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "rounded-2xl bg-secondary px-5 py-4 text-sm font-semibold",
								children: item
							}, item))
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					id: "faq",
					className: "scroll-mt-24 py-20",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-3xl font-extrabold",
						children: "Frequently asked"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-8 grid gap-5 md:grid-cols-2",
						children: [
							["Can reports be printed or downloaded?", "Reports are viewable on screen. Printing and export are outside the current scope of the study."],
							["Does it work offline?", "No. The portal is server-based and needs a stable internet connection."],
							["Which devices are supported?", "Desktop browsers on Windows 10/11 and Android 7+ phones and tablets."],
							["How is access controlled?", "Three role levels — seniors see only their own record, OSCA staff and admins manage all records."]
						].map(([q, a]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "surface-card p-7",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-base font-bold",
								children: q
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-sm text-muted-foreground",
								children: a
							})]
						}, q))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
					className: "surface-card mb-8 flex flex-wrap items-center justify-center gap-4 px-8 py-6 text-center text-sm text-muted-foreground",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Office of Senior Citizen Affairs · Municipality of Bulan, Sorsogon" })
				})
			]
		})
	});
}
//#endregion
export { Landing as component };
