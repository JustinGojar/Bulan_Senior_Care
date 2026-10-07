import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { b as getStoredUser, i as apiFetch } from "./router-D67W07gD.mjs";
import { D as MapPin, l as TrendingUp, n as Users, rt as ChartPie } from "../_libs/lucide-react.mjs";
import { t as AppShell } from "./AppShell-CSdz8EAS.mjs";
import { a as YAxis, c as Line, d as Pie, f as Cell, h as Legend, i as LineChart, l as CartesianGrid, m as Tooltip, n as PieChart, o as XAxis, p as ResponsiveContainer, r as BarChart, s as Area, t as AreaChart, u as Bar } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/analytics-kaGKmx_G.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var PIE_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)"
];
function CardHead({ icon: Icon, title }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "text-lg font-bold",
			children: title
		})]
	});
}
function Analytics() {
	const navigate = useNavigate();
	const currentUser = getStoredUser();
	const [analytics, setAnalytics] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [error, setError] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (currentUser?.role === "leader") navigate({
			to: "/dashboard",
			replace: true
		});
		if (currentUser?.role !== "leader") apiFetch("/analytics").then(setAnalytics).catch((reason) => setError(reason.message)).finally(() => setLoading(false));
	}, [currentUser?.role, navigate]);
	if (currentUser?.role === "leader") return null;
	const barangaySummary = analytics?.barangay_summary ?? [];
	const zoneParticipants = barangaySummary.map(({ barangay: zone, registered: total }) => ({
		zone,
		total
	}));
	const ageDistribution = analytics?.age_distribution ?? [];
	const benefitRecords = analytics?.benefit_records ?? [];
	const municipalTotal = analytics?.municipal.total_registered ?? 0;
	const trendData = analytics?.trend ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, {
		title: "Analytics",
		subtitle: "Descriptive analytics across barangays, age groups, and benefits",
		breadcrumb: ["Dashboard", "Analytics"],
		children: [
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-6 rounded-xl bg-destructive/10 p-4 text-sm text-destructive",
				children: error
			}),
			loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-6 text-sm text-muted-foreground",
				children: "Loading analytics data..."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "surface-card p-7",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
						icon: MapPin,
						title: "Total Participants per Zone / Barangay"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-6 h-72",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
							width: "100%",
							height: "100%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
								data: zoneParticipants,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
										id: "zoneFill",
										x1: "0",
										y1: "0",
										x2: "0",
										y2: "1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
											offset: "0%",
											stopColor: "var(--chart-1)",
											stopOpacity: .25
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
											offset: "100%",
											stopColor: "var(--chart-1)",
											stopOpacity: .02
										})]
									}) }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
										stroke: "var(--border)",
										vertical: false
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
										dataKey: "zone",
										tickLine: false,
										axisLine: false,
										fontSize: 12
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
										tickLine: false,
										axisLine: false,
										fontSize: 12,
										domain: [0, 1e3],
										ticks: [
											0,
											50,
											100,
											150,
											200,
											300,
											400,
											500,
											600,
											700,
											800,
											900,
											1e3
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
										type: "monotone",
										dataKey: "total",
										stroke: "var(--chart-1)",
										strokeWidth: 2.5,
										fill: "url(#zoneFill)",
										dot: {
											r: 4,
											fill: "var(--chart-1)"
										}
									})
								]
							})
						})
					}),
					loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-muted-foreground",
						children: "Loading live analytics..."
					}),
					!loading && zoneParticipants.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-muted-foreground",
						children: "No senior records available."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 grid gap-6 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "surface-card p-7",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
						icon: Users,
						title: "Age Distribution"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-6 h-72",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
							width: "100%",
							height: "100%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
								data: ageDistribution,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
										stroke: "var(--border)",
										vertical: false
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
										dataKey: "age",
										tickLine: false,
										axisLine: false,
										fontSize: 12
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
										tickLine: false,
										axisLine: false,
										fontSize: 12,
										domain: [0, 1e3],
										ticks: [
											0,
											50,
											100,
											150,
											200,
											300,
											400,
											500,
											600,
											700,
											800,
											900,
											1e3
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
										dataKey: "count",
										name: "Seniors",
										fill: "var(--chart-1)",
										radius: [
											4,
											4,
											0,
											0
										]
									})
								]
							})
						})
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "surface-card p-7",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
							icon: ChartPie,
							title: "Benefit Records"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-6 h-72",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
								width: "100%",
								height: "100%",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PieChart, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pie, {
										data: benefitRecords,
										dataKey: "value",
										nameKey: "name",
										innerRadius: 70,
										outerRadius: 110,
										paddingAngle: 2,
										children: benefitRecords.map((entry, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, { fill: PIE_COLORS[i % PIE_COLORS.length] }, entry.name))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, {})
								] })
							})
						}),
						!loading && benefitRecords.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm text-muted-foreground",
							children: "No benefit records available."
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "surface-card mt-6 p-7",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
						icon: TrendingUp,
						title: "Trend and Analytics by Barangay and Municipality"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted-foreground",
						children: "Registered seniors, released benefits, and cumulative municipal registrations."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-6 h-72",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
							width: "100%",
							height: "100%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LineChart, {
								data: trendData,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
										stroke: "var(--border)",
										vertical: false
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
										dataKey: "barangay",
										tickLine: false,
										axisLine: false,
										fontSize: 12
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
										tickLine: false,
										axisLine: false,
										fontSize: 12
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
										type: "monotone",
										dataKey: "registered",
										name: "Barangay registered",
										stroke: "var(--chart-1)",
										strokeWidth: 2
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
										type: "monotone",
										dataKey: "released",
										name: "Benefits released",
										stroke: "var(--chart-2)",
										strokeWidth: 2
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
										type: "monotone",
										dataKey: "municipal",
										name: "Municipal cumulative",
										stroke: "var(--chart-3)",
										strokeWidth: 2
									})
								]
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 text-xs text-muted-foreground",
						children: ["Municipal registered total: ", municipalTotal.toLocaleString()]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "surface-card mt-6 p-7",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHead, {
					icon: MapPin,
					title: "Barangay-Level Summary"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6 overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full min-w-[560px] text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", {
							className: "text-left",
							children: [
								"Barangay",
								"Registered",
								"Benefits Released",
								"Coverage"
							].map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-4 py-3 font-bold",
								children: h
							}, h))
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [barangaySummary.map((row) => {
							const pct = Math.round(row.released / row.registered * 100);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-t border-border",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-4 py-4 font-medium",
										children: row.barangay
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-4 py-4 text-muted-foreground",
										children: row.registered
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-4 py-4 text-muted-foreground",
										children: row.released
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-4 py-4",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "h-2 w-32 rounded-full bg-secondary",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "bg-navy h-2 rounded-full",
													style: { width: `${pct}%` }
												})
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-xs font-bold",
												children: [pct, "%"]
											})]
										})
									})
								]
							}, row.barangay);
						}), !loading && barangaySummary.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							colSpan: 4,
							className: "px-4 py-8 text-center text-muted-foreground",
							children: "No barangay records available."
						}) })] })]
					})
				})]
			})
		]
	});
}
//#endregion
export { Analytics as component };
