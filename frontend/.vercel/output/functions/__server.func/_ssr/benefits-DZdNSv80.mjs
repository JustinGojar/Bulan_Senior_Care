import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { b as getStoredUser, i as apiFetch, r as API_URL } from "./router-D67W07gD.mjs";
import { F as HandCoins, J as CircleX, V as Download, X as CircleCheck, h as ShieldCheck, ot as CalendarDays, x as Plus } from "../_libs/lucide-react.mjs";
import { t as AppShell } from "./AppShell-CSdz8EAS.mjs";
import { t as loadPdfLogo } from "./pdf-DzIvGhFR.mjs";
import { a as DialogHeader, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-CeycyYL_.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/benefits-DZdNSv80.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function BenefitTracking() {
	const [programs, setPrograms] = (0, import_react.useState)([]);
	const [transactions, setTransactions] = (0, import_react.useState)([]);
	const [releaseSchedules, setReleaseSchedules] = (0, import_react.useState)([]);
	const [barangays, setBarangays] = (0, import_react.useState)([]);
	const [transactionPage, setTransactionPage] = (0, import_react.useState)(1);
	const [transactionLastPage, setTransactionLastPage] = (0, import_react.useState)(1);
	const [releaseFormOpen, setReleaseFormOpen] = (0, import_react.useState)(false);
	const [selectedBenefitId, setSelectedBenefitId] = (0, import_react.useState)("");
	const [amount, setAmount] = (0, import_react.useState)("");
	const [releaseDate, setReleaseDate] = (0, import_react.useState)("");
	const [remarks, setRemarks] = (0, import_react.useState)("");
	const [savingRelease, setSavingRelease] = (0, import_react.useState)(false);
	const [selectedBarangay, setSelectedBarangay] = (0, import_react.useState)("All");
	const [selectedBenefit, setSelectedBenefit] = (0, import_react.useState)("All");
	const [error, setError] = (0, import_react.useState)(null);
	const currentUser = getStoredUser();
	const isHead = currentUser?.role === "head";
	const isLeader = currentUser?.role === "leader";
	const canManageReleases = currentUser?.role === "admin" || currentUser?.role === "head";
	const canUpdateTransactions = currentUser?.role === "leader";
	function formatDate(date) {
		const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) ? /* @__PURE__ */ new Date(`${date}T00:00:00`) : new Date(date);
		if (Number.isNaN(parsed.getTime())) return "No release date entered";
		return parsed.toLocaleDateString(void 0, {
			month: "short",
			day: "numeric",
			year: "numeric"
		});
	}
	const barangayOptions = (0, import_react.useMemo)(() => [
		"All",
		...barangays.map((barangay) => barangay.barangay_name),
		"Unassigned"
	], [barangays]);
	(0, import_react.useMemo)(() => ["All", ...programs.map((program) => program.name)], [programs]);
	const filteredTransactions = (0, import_react.useMemo)(() => transactions.filter((transaction) => {
		const barangayMatch = selectedBarangay === "All" || (transaction.senior.barangay?.barangay_name ?? "Unassigned") === selectedBarangay;
		const benefitMatch = selectedBenefit === "All" || transaction.benefit.benefit_name === selectedBenefit;
		return barangayMatch && benefitMatch;
	}), [
		selectedBarangay,
		selectedBenefit,
		transactions
	]);
	(0, import_react.useEffect)(() => {
		apiFetch("/benefits").then((benefitResult) => setPrograms(benefitResult.map((program) => ({
			id: program.id,
			name: program.benefit_name,
			type: program.benefit_type,
			minAge: program.min_age,
			...program.max_age === null ? {} : { maxAge: program.max_age },
			amount: program.amount ? `₱${Number(program.amount).toLocaleString()}` : "Variable",
			schedule: program.schedule === "one_time" ? "One-time" : program.schedule === "quarterly" ? "Quarterly" : "When funds are available",
			funding: program.funding_source.charAt(0).toUpperCase() + program.funding_source.slice(1)
		})))).catch((reason) => setError(reason.message));
		apiFetch(`/benefit-transactions?page=${transactionPage}&per_page=25`).then((result) => {
			setTransactions(result.data);
			setTransactionLastPage(result.last_page);
		}).catch(() => setTransactions([]));
		apiFetch("/barangays").then((result) => {
			setBarangays(result);
			if (isLeader) setSelectedBarangay(result.find((barangay) => barangay.id === currentUser?.barangay_id)?.barangay_name ?? "Unassigned");
		}).catch(() => setBarangays([]));
		apiFetch("/benefit-releases?page=1&per_page=50").then((result) => setReleaseSchedules(result.data)).catch(() => setReleaseSchedules([]));
	}, [
		currentUser?.barangay_id,
		isLeader,
		transactionPage
	]);
	function resetReleaseForm() {
		setSelectedBenefitId("");
		setAmount("");
		setReleaseDate("");
		setRemarks("");
	}
	function openAddRelease() {
		resetReleaseForm();
		setReleaseFormOpen(true);
	}
	async function updateTransaction(transaction, status) {
		const date = status === "released" ? window.prompt("Enter the actual release date (YYYY-MM-DD):", transaction.date_distributed ?? "") : null;
		if (status === "released" && !date) return;
		try {
			const updated = await apiFetch(`/benefit-transactions/${transaction.id}`, {
				method: "PATCH",
				body: JSON.stringify({
					status,
					amount: transaction.amount,
					period_label: transaction.period_label,
					date_distributed: date,
					remarks: transaction.remarks
				})
			});
			setTransactions((current) => current.map((item) => item.id === updated.id ? updated : item));
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "Unable to update benefit status.");
		}
	}
	async function saveRelease(event) {
		event.preventDefault();
		setSavingRelease(true);
		try {
			const saved = await apiFetch("/benefit-releases", {
				method: "POST",
				body: JSON.stringify({
					benefit_id: selectedBenefitId,
					amount,
					period_label: (/* @__PURE__ */ new Date(`${releaseDate}T00:00:00`)).toLocaleDateString("en-US", {
						month: "long",
						year: "numeric"
					}),
					release_date: releaseDate,
					status: "scheduled",
					remarks
				})
			});
			setReleaseSchedules((current) => [saved, ...current]);
			setReleaseFormOpen(false);
			resetReleaseForm();
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "Unable to save benefit release.");
		} finally {
			setSavingRelease(false);
		}
	}
	async function exportBenefits() {
		if (filteredTransactions.length === 0) {
			setError("There are no matching benefit records to export.");
			return;
		}
		try {
			const { jsPDF } = await import("../_libs/jspdf.mjs").then((n) => /* @__PURE__ */ __toESM(n.t()));
			const document = new jsPDF({ orientation: "landscape" });
			const generatedDate = /* @__PURE__ */ new Date();
			const logoDataUrl = await loadPdfLogo();
			document.addImage(logoDataUrl, "PNG", 14, 7, 14, 14);
			document.setFontSize(18);
			document.text("Bulan SeniorCare", 32, 18);
			document.setFontSize(13);
			document.text("Benefit Tracking Report", 14, 28);
			document.setFontSize(9);
			document.text(`Generated: ${generatedDate.toLocaleDateString()}`, 14, 36);
			document.text(`Records: ${filteredTransactions.length}`, 14, 43);
			let y = 56;
			document.setFont("helvetica", "bold");
			document.text("Senior", 14, y);
			document.text("Program", 82, y);
			document.text("Barangay", 145, y);
			document.text("Source", 205, y);
			document.text("Status", 260, y);
			document.setFont("helvetica", "normal");
			y += 7;
			filteredTransactions.forEach((transaction) => {
				if (y > 195) {
					document.addPage();
					y = 18;
				}
				const seniorName = [
					transaction.senior.first_name,
					transaction.senior.middle_name,
					transaction.senior.last_name
				].filter(Boolean).join(" ");
				const source = transaction.senior.encoder?.name ?? "Unknown";
				const status = transaction.status === "released" ? "Received" : transaction.status === "failed" ? "Not received" : "Pending";
				document.text(document.splitTextToSize(seniorName, 62)[0] ?? seniorName, 14, y);
				document.text(document.splitTextToSize(transaction.benefit.benefit_name, 58)[0] ?? transaction.benefit.benefit_name, 82, y);
				document.text(document.splitTextToSize(transaction.senior.barangay?.barangay_name ?? "Unassigned", 54)[0] ?? "Unassigned", 145, y);
				document.text(document.splitTextToSize(source, 48)[0] ?? source, 205, y);
				document.text(status, 260, y);
				y += 7;
			});
			document.save(`bulan-seniorcare-benefits-${generatedDate.toISOString().slice(0, 10)}.pdf`);
			setError(null);
		} catch {
			setError("Unable to export benefit records.");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, {
		title: "Benefit Tracking",
		subtitle: "Monitor program enrollment and releases",
		breadcrumb: ["Dashboard", "Benefit Tracking"],
		actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center gap-2",
			children: [
				!isLeader && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap items-center gap-2 rounded-full bg-card p-1 shadow-[var(--shadow-soft)]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "relative",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "sr-only",
							children: "Filter by barangay"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							value: selectedBarangay,
							onChange: (event) => setSelectedBarangay(event.target.value),
							className: "rounded-full border border-transparent bg-transparent px-4 py-2.5 text-sm font-semibold text-foreground outline-none",
							children: barangayOptions.map((barangay) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: barangay,
								children: barangay === "All" ? "All barangay" : barangay
							}, barangay))
						})]
					})
				}),
				(!isLeader && selectedBarangay !== "All" || selectedBenefit !== "All") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => {
						if (!isLeader) setSelectedBarangay("All");
						setSelectedBenefit("All");
					},
					className: "rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold",
					children: "Clear"
				}),
				isHead && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: exportBenefits,
					className: "bg-navy rounded-full px-6 py-3.5 text-sm font-semibold text-primary-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "mr-2 inline h-4 w-4" }), " Export PDF"]
				}),
				canManageReleases && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: openAddRelease,
					className: "bg-navy rounded-full px-6 py-3.5 text-sm font-semibold text-primary-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-2 inline h-4 w-4" }), " Add Release"]
				})
			]
		}),
		children: [
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-4 text-sm font-medium text-destructive",
				children: error
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Expanded Centenarian:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "rounded-full bg-secondary px-3 py-1 font-semibold text-foreground",
					children: selectedBenefit === "All" ? "All Expanded Centenarian programs" : selectedBenefit
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-5 md:grid-cols-2 xl:grid-cols-3",
				children: [programs.map((program) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("article", {
					role: "button",
					tabIndex: 0,
					"aria-pressed": selectedBenefit === program.name,
					onClick: () => setSelectedBenefit(selectedBenefit === program.name ? "All" : program.name),
					onKeyDown: (event) => {
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							setSelectedBenefit(selectedBenefit === program.name ? "All" : program.name);
						}
					},
					className: `surface-card cursor-pointer p-6 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-navy/40 ${selectedBenefit === program.name ? "ring-2 ring-navy/40" : ""}`,
					children: (() => {
						const programTransactions = filteredTransactions.filter((transaction) => transaction.benefit.benefit_name === program.name);
						const received = programTransactions.filter((transaction) => transaction.status === "released").length;
						const notReceived = programTransactions.filter((transaction) => transaction.status === "failed").length;
						const pending = programTransactions.filter((transaction) => transaction.status === "pending").length;
						const releaseDates = releaseSchedules.filter((release) => release.benefit.benefit_name === program.name && release.status !== "cancelled").map((release) => release.release_date).sort().reverse();
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "bg-gold grid h-11 w-11 place-items-center rounded-2xl text-gold-foreground",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HandCoins, { className: "h-5 w-5" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "rounded-full bg-secondary px-3 py-1 text-xs font-bold",
									children: program.funding
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "mt-5 font-display text-lg font-bold",
								children: program.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-3xl font-extrabold",
								children: program.amount
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 flex items-center gap-2 text-xs text-muted-foreground",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarDays, { className: "h-4 w-4" }),
									" ",
									program.schedule
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-2 text-xs text-muted-foreground",
								children: [
									"Eligibility: age ",
									program.minAge,
									program.maxAge ? `-${program.maxAge}` : "+"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-5 border-t border-border pt-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs font-bold uppercase tracking-wide text-muted-foreground",
										children: "Release status"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-3 flex flex-wrap gap-2 text-xs font-bold",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "rounded-full bg-success/15 px-3 py-1.5 text-success",
												children: ["Received: ", received]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "rounded-full bg-gold/20 px-3 py-1.5 text-gold-foreground",
												children: ["Not yet: ", pending]
											}),
											notReceived > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "rounded-full bg-destructive/10 px-3 py-1.5 text-destructive",
												children: ["Not received: ", notReceived]
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-3 rounded-xl bg-secondary px-3 py-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-muted-foreground",
											children: "Release date for this Expanded Centenarian program"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-1 text-sm font-bold",
											children: releaseDates[0] ? formatDate(releaseDates[0]) : "No release date entered"
										})]
									})
								]
							})
						] });
					})()
				}, program.type)), !error && programs.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "No benefit programs available."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "surface-card mt-6 p-7",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-4 w-4" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-lg font-bold",
							children: "Release queue"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted-foreground",
							children: "Transactions are linked to a senior and program; one-time grants cannot be duplicated."
						})] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-6 overflow-x-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full min-w-[940px] text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", {
								className: "text-left",
								children: [
									"Senior",
									"Program",
									"Barangay",
									"Source",
									"Release date",
									"Status",
									"Audit",
									...canUpdateTransactions ? ["Action"] : []
								].map((heading) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-3 font-bold",
									children: heading
								}, heading))
							}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [filteredTransactions.map((transaction) => {
								const seniorName = [
									transaction.senior.first_name,
									transaction.senior.middle_name,
									transaction.senior.last_name
								].filter(Boolean).join(" ");
								const statusLabel = transaction.status === "released" ? "Received" : transaction.status === "failed" ? "Not received" : "Pending";
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-t border-border",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-4 font-semibold",
											children: seniorName
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-4",
											children: transaction.benefit.benefit_name
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-4 text-muted-foreground",
											children: transaction.senior.barangay?.barangay_name ?? "Unassigned"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-4 text-muted-foreground",
											children: transaction.senior.encoder?.role === "leader" ? `BSCA: ${transaction.senior.encoder.name}` : transaction.senior.encoder?.name ?? "Unknown"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-4 text-muted-foreground",
											children: transaction.date_distributed ? formatDate(transaction.date_distributed) : "-"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: `px-4 py-4 font-bold ${transaction.status === "released" ? "text-success" : transaction.status === "failed" ? "text-destructive" : "text-gold-foreground"}`,
											children: statusLabel
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "px-4 py-4 text-xs text-muted-foreground",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: ["Created by ", transaction.creator?.name ?? transaction.distributor?.name ?? "Unknown"] }),
												transaction.created_at && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: new Date(transaction.created_at).toLocaleString() }),
												transaction.updater && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
													className: "mt-1",
													children: ["Modified by ", transaction.updater.name]
												}),
												transaction.attachment_path && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
													href: `${API_URL.replace(/\/api$/, "")}/storage/${transaction.attachment_path}`,
													target: "_blank",
													rel: "noreferrer",
													className: "mt-1 inline-block font-semibold text-foreground underline",
													children: "Open proof"
												})
											]
										}),
										canUpdateTransactions && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-4",
											children: transaction.status === "pending" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex flex-wrap gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													type: "button",
													onClick: () => updateTransaction(transaction, "released"),
													className: "inline-flex items-center gap-1 rounded-full bg-success/15 px-3 py-2 text-xs font-bold text-success",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-3.5 w-3.5" }), " Received"]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													type: "button",
													onClick: () => updateTransaction(transaction, "failed"),
													className: "inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { className: "h-3.5 w-3.5" }), " Not received"]
												})]
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: `inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-bold ${transaction.status === "released" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`,
												children: [transaction.status === "released" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { className: "h-3.5 w-3.5" }), transaction.status === "released" ? "Received" : "Not received"]
											})
										})
									]
								}, transaction.id);
							}), filteredTransactions.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								colSpan: canUpdateTransactions ? 8 : 7,
								className: "px-4 py-8 text-center text-muted-foreground",
								children: "No records available for the selected barangay and Expanded Centenarian program."
							}) })] })]
						})
					}),
					transactionLastPage > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-5 flex items-center justify-between gap-3 border-t border-border pt-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted-foreground",
							children: [
								"Page ",
								transactionPage,
								" of ",
								transactionLastPage
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: transactionPage === 1,
								onClick: () => setTransactionPage((page) => page - 1),
								className: "rounded-full px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-40",
								children: "Previous"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: transactionPage === transactionLastPage,
								onClick: () => setTransactionPage((page) => page + 1),
								className: "rounded-full bg-navy px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40",
								children: "Next"
							})]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: releaseFormOpen,
				onOpenChange: (open) => {
					setReleaseFormOpen(open);
					if (!open) resetReleaseForm();
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
						className: "font-display",
						children: "Add Release"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Enter the actual release details. The release date is never assigned automatically." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: saveRelease,
						className: "grid gap-4 sm:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs font-semibold text-muted-foreground",
								children: "Expanded Centenarian"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								required: true,
								value: selectedBenefitId,
								onChange: (event) => {
									setSelectedBenefitId(event.target.value);
									const selected = programs.find((program) => String(program.id) === event.target.value);
									setAmount(selected?.amount === "Variable" ? "" : selected?.amount.replace(/[^0-9.]/g, "") ?? "");
								},
								className: "mt-1 w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "",
									children: "Select benefit"
								}), programs.map((program) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: program.id,
									children: program.name
								}, program.id))]
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs font-semibold text-muted-foreground",
								children: "Amount"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								required: true,
								min: "0",
								step: "0.01",
								type: "number",
								value: amount,
								onChange: (event) => setAmount(event.target.value),
								placeholder: "0.00",
								className: "mt-1 w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs font-semibold text-muted-foreground",
								children: "Release Date"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								required: true,
								type: "date",
								value: releaseDate,
								onChange: (event) => setReleaseDate(event.target.value),
								className: "mt-1 w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs font-semibold text-muted-foreground",
								children: "Remarks"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: remarks,
								onChange: (event) => setRemarks(event.target.value),
								placeholder: "Optional remarks",
								className: "mt-1 w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-end gap-2 sm:col-span-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setReleaseFormOpen(false),
									className: "rounded-full bg-secondary px-5 py-3 text-sm font-semibold",
									children: "Cancel"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "submit",
									disabled: savingRelease,
									className: "bg-navy rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60",
									children: savingRelease ? "Saving..." : "Save release"
								})]
							})
						]
					})]
				})
			})
		]
	});
}
//#endregion
export { BenefitTracking as component };
