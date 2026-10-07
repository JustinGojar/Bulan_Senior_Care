import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { L as FileText, V as Download, X as CircleCheck, b as Printer } from "../_libs/lucide-react.mjs";
import { t as AppShell } from "./AppShell-CSdz8EAS.mjs";
import { t as useSeniors } from "./use-seniors-BRd-0AsJ.mjs";
import { t as loadPdfLogo } from "./pdf-DzIvGhFR.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reports-BISSKoOf.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var REPORTS = [
	[
		"Q2 2026 Benefit Distribution",
		"Draft",
		"Apr 18, 2026"
	],
	[
		"Municipal Senior Citizen Registry",
		"Published",
		"Apr 15, 2026"
	],
	[
		"Barangay Participation Summary",
		"Approved",
		"Apr 10, 2026"
	]
];
function Reports() {
	const { seniors, loading } = useSeniors();
	const [generatedAt, setGeneratedAt] = (0, import_react.useState)(null);
	const summary = (0, import_react.useMemo)(() => ({
		total: seniors.length,
		active: seniors.filter((senior) => senior.status === "Active").length,
		pending: seniors.filter((senior) => senior.status === "Pending").length,
		inactive: seniors.filter((senior) => senior.status === "Inactive").length
	}), [seniors]);
	function generateReport() {
		setGeneratedAt((/* @__PURE__ */ new Date()).toLocaleString());
		toast.success("Report generated from the latest senior records.");
	}
	function printReport() {
		if (!generatedAt) generateReport();
		window.setTimeout(() => window.print(), 0);
	}
	async function exportPdf() {
		const { jsPDF } = await import("../_libs/jspdf.mjs").then((n) => /* @__PURE__ */ __toESM(n.t()));
		const document = new jsPDF();
		const generatedDate = /* @__PURE__ */ new Date();
		const dateLabel = generatedDate.toLocaleDateString();
		const logoDataUrl = await loadPdfLogo();
		document.addImage(logoDataUrl, "PNG", 14, 7, 14, 14);
		document.setFontSize(18);
		document.text("Bulan SeniorCare", 32, 18);
		document.setFontSize(13);
		document.text("Municipal Senior Citizen Registry", 14, 28);
		document.setFontSize(9);
		document.text(`Generated: ${dateLabel}`, 14, 36);
		document.setFontSize(10);
		document.text(`Total records: ${summary.total}`, 14, 50);
		document.text(`Active: ${summary.active}`, 70, 50);
		document.text(`Pending: ${summary.pending}`, 115, 50);
		document.text(`Inactive: ${summary.inactive}`, 165, 50);
		let y = 64;
		document.setFontSize(9);
		document.setFont("helvetica", "bold");
		document.text("Senior ID", 14, y);
		document.text("Name", 45, y);
		document.text("Age", 105, y);
		document.text("Barangay", 122, y);
		document.text("Benefit", 165, y);
		document.text("Status", 195, y);
		document.setFont("helvetica", "normal");
		y += 7;
		seniors.forEach((senior) => {
			if (y > 280) {
				document.addPage();
				y = 18;
			}
			document.text(senior.id, 14, y);
			document.text(document.splitTextToSize(senior.name, 55)[0] ?? senior.name, 45, y);
			document.text(String(senior.age), 105, y);
			document.text(document.splitTextToSize(senior.barangay, 40)[0] ?? senior.barangay, 122, y);
			document.text(document.splitTextToSize(senior.benefit, 28)[0] ?? senior.benefit, 165, y);
			document.text(senior.status, 195, y);
			y += 7;
		});
		document.save(`bulan-seniorcare-report-${generatedDate.toISOString().slice(0, 10)}.pdf`);
		toast.success("PDF report downloaded.");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, {
		title: "Reports",
		subtitle: "Generate, approve, and publish OSCA reports",
		breadcrumb: ["Dashboard", "Reports"],
		actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			onClick: generateReport,
			className: "bg-navy rounded-full px-6 py-3.5 text-sm font-semibold text-primary-foreground print:hidden",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "mr-2 inline h-4 w-4" }), " Generate report"]
		}),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "surface-card p-7 print:hidden",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "h-4 w-4" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-bold",
					children: "Report workflow"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Admin drafts, Head approves, and approved reports can be published or exported."
				})] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-6 space-y-3",
				children: REPORTS.map(([name, status, date]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-secondary p-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-bold",
						children: name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-xs text-muted-foreground",
						children: ["Generated ", date]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: `inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${status === "Published" ? "bg-success/15 text-success" : "bg-gold/20 text-gold-foreground"}`,
							children: [status === "Published" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-3 w-3" }), status]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: printReport,
							className: "grid h-9 w-9 place-items-center rounded-full bg-card print:hidden",
							"aria-label": `Print ${name}`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Printer, { className: "h-4 w-4" })
						})]
					})]
				}, name))
			})]
		}), generatedAt && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "surface-card mt-6 p-7 print:mt-0 print:shadow-none",
			id: "generated-report",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground",
								children: "Generated report"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "mt-2 text-2xl font-extrabold",
								children: "Municipal Senior Citizen Registry"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-sm text-muted-foreground",
								children: ["Generated ", generatedAt]
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: printReport,
							className: "inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-semibold print:hidden",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Printer, { className: "h-4 w-4" }), " Print report"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: exportPdf,
							className: "bg-navy inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground print:hidden",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-4 w-4" }), " Export PDF"]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6 grid gap-3 sm:grid-cols-4",
					children: [
						["Total records", summary.total],
						["Active", summary.active],
						["Pending", summary.pending],
						["Inactive", summary.inactive]
					].map(([label, value]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-2xl bg-secondary p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-semibold text-muted-foreground",
							children: label
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-2xl font-extrabold",
							children: loading ? "..." : value
						})]
					}, String(label)))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6 overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full min-w-[640px] text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", {
							className: "border-b border-border text-left",
							children: [
								"Senior ID",
								"Name",
								"Age",
								"Barangay",
								"Benefit",
								"Status"
							].map((heading) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-3 py-3 font-bold",
								children: heading
							}, heading))
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: seniors.map((senior) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-b border-border",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-3",
									children: senior.id
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-3 font-semibold",
									children: senior.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-3",
									children: senior.age
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-3",
									children: senior.barangay
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-3",
									children: senior.benefit
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-3",
									children: senior.status
								})
							]
						}, senior.id)) })]
					})
				})
			]
		})]
	});
}
//#endregion
export { Reports as component };
