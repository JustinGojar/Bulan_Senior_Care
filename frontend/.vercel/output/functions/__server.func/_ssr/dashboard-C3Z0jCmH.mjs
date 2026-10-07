import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { b as getStoredUser, c as createAnnouncementComment, i as apiFetch, p as getAnnouncements, s as createAnnouncement } from "./router-D67W07gD.mjs";
import { E as Megaphone, P as ImagePlus, U as CornerUpLeft, W as Clock, a as UserCheck, c as TriangleAlert, h as ShieldCheck, n as Users, t as X } from "../_libs/lucide-react.mjs";
import { t as AppShell } from "./AppShell-CSdz8EAS.mjs";
import { r as findNewEligibilityFlags } from "./osca-data-CD4Joyu-.mjs";
import { t as useSeniors } from "./use-seniors-BRd-0AsJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/dashboard-C3Z0jCmH.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Dashboard() {
	const { seniors, totalCount, activeCount, pendingCount, loading } = useSeniors();
	const currentUser = getStoredUser();
	const [announcements, setAnnouncements] = (0, import_react.useState)([]);
	const [selectedAnnouncement, setSelectedAnnouncement] = (0, import_react.useState)(null);
	const [commentMessage, setCommentMessage] = (0, import_react.useState)("");
	const [replyMessage, setReplyMessage] = (0, import_react.useState)("");
	const [replyTo, setReplyTo] = (0, import_react.useState)(null);
	const [commentSaving, setCommentSaving] = (0, import_react.useState)(false);
	const [showAnnouncementForm, setShowAnnouncementForm] = (0, import_react.useState)(false);
	const [announcementTitle, setAnnouncementTitle] = (0, import_react.useState)("");
	const [announcementMessage, setAnnouncementMessage] = (0, import_react.useState)("");
	const [announcementImage, setAnnouncementImage] = (0, import_react.useState)(null);
	const [announcementImagePreview, setAnnouncementImagePreview] = (0, import_react.useState)(null);
	const [announcementError, setAnnouncementError] = (0, import_react.useState)(null);
	const [overview, setOverview] = (0, import_react.useState)(null);
	const [announcementSaving, setAnnouncementSaving] = (0, import_react.useState)(false);
	const eligibilityFlags = findNewEligibilityFlags(seniors.filter((senior) => senior.status !== "Pending"));
	(0, import_react.useEffect)(() => {
		getAnnouncements().then((loadedAnnouncements) => {
			setAnnouncements(loadedAnnouncements);
			const match = window.location.hash.match(/^#announcement-(\d+)$/);
			const announcement = match ? loadedAnnouncements.find((item) => item.id === Number(match[1])) : void 0;
			if (announcement) setSelectedAnnouncement(announcement);
		}).catch(() => setAnnouncements([]));
	}, []);
	(0, import_react.useEffect)(() => {
		apiFetch("/overview").then(setOverview).catch(() => setOverview(null));
	}, []);
	(0, import_react.useEffect)(() => {
		if (!announcementImage) {
			setAnnouncementImagePreview(null);
			return;
		}
		const previewUrl = URL.createObjectURL(announcementImage);
		setAnnouncementImagePreview(previewUrl);
		return () => URL.revokeObjectURL(previewUrl);
	}, [announcementImage]);
	async function handleCreateAnnouncement(event) {
		event.preventDefault();
		setAnnouncementSaving(true);
		setAnnouncementError(null);
		try {
			const announcement = await createAnnouncement(announcementTitle, announcementMessage, announcementImage);
			setAnnouncements((current) => [announcement, ...current]);
			setAnnouncementTitle("");
			setAnnouncementMessage("");
			setAnnouncementImage(null);
			setShowAnnouncementForm(false);
		} catch (error) {
			setAnnouncementError(error instanceof Error ? error.message : "Unable to create announcement.");
		} finally {
			setAnnouncementSaving(false);
		}
	}
	async function handleCreateComment(event, parentCommentId) {
		event.preventDefault();
		if (!selectedAnnouncement) return;
		const message = parentCommentId ? replyMessage : commentMessage;
		if (!message.trim()) return;
		setCommentSaving(true);
		try {
			const comment = await createAnnouncementComment(selectedAnnouncement.id, message.trim(), parentCommentId);
			const comments = parentCommentId ? (selectedAnnouncement.comments ?? []).map((item) => item.id === parentCommentId ? {
				...item,
				replies: [...item.replies ?? [], comment]
			} : item) : [...selectedAnnouncement.comments ?? [], comment];
			setSelectedAnnouncement({
				...selectedAnnouncement,
				comments
			});
			setAnnouncements((current) => current.map((announcement) => announcement.id === selectedAnnouncement.id ? {
				...announcement,
				comments
			} : announcement));
			if (parentCommentId) {
				setReplyMessage("");
				setReplyTo(null);
			} else setCommentMessage("");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Unable to send comment.");
		} finally {
			setCommentSaving(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, {
		title: "System Dashboard",
		subtitle: "Overview of OSCA Bulan operations and analytics",
		breadcrumb: ["Dashboard"],
		children: [
			currentUser?.role === "head" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => setShowAnnouncementForm(true),
				className: "surface-card mb-6 flex w-full items-center gap-4 p-4 text-left transition-shadow hover:shadow-[var(--shadow-soft)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "bg-navy grid h-11 w-11 shrink-0 place-items-center rounded-full text-primary-foreground",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Megaphone, { className: "h-5 w-5" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "flex-1 text-sm text-muted-foreground",
					children: "What is the announcement?"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-6 sm:grid-cols-2 xl:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "surface-card p-6",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "bg-navy grid h-12 w-12 place-items-center rounded-2xl text-primary-foreground",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "h-5 w-5" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "rounded-full bg-secondary px-3 py-1 text-[10px] font-bold tracking-wider text-muted-foreground",
									children: "LIVE"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-6 text-sm font-semibold text-muted-foreground",
								children: "Total Registered"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-4xl font-extrabold",
								children: loading ? "..." : totalCount.toLocaleString()
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-4 text-xs text-muted-foreground",
								children: "Current senior records"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "surface-card p-6",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid h-12 w-12 place-items-center rounded-2xl bg-gold text-gold-foreground",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-5 w-5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-6 text-sm font-semibold text-muted-foreground",
								children: "Total Benefits Distributed"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-4xl font-extrabold",
								children: overview ? overview.benefits_distributed_count.toLocaleString() : "..."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-4 text-xs text-muted-foreground",
								children: "Released benefit transactions"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "surface-card p-6",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid h-12 w-12 place-items-center rounded-2xl bg-success text-success-foreground",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserCheck, { className: "h-5 w-5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-6 text-sm font-semibold text-muted-foreground",
								children: "Active Seniors"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-4xl font-extrabold",
								children: loading ? "..." : activeCount.toLocaleString()
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-4 text-xs text-muted-foreground",
								children: "Verified and receiving benefits"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "surface-card p-6",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid h-12 w-12 place-items-center rounded-2xl bg-coral text-coral-foreground",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-5 w-5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-6 text-sm font-semibold text-muted-foreground",
								children: "Pending Applications"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-4xl font-extrabold",
								children: loading ? "..." : pendingCount.toLocaleString()
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-4 text-xs text-muted-foreground",
								children: "Awaiting eligibility verification"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: currentUser?.role === "admin" ? "mt-6 grid gap-6 lg:grid-cols-2" : "mt-6 space-y-6",
				children: [
					currentUser?.role === "head" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "surface-card p-7",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-lg font-bold",
								children: "Benefits received by age"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-sm text-muted-foreground",
								children: "Live count of seniors who received each age-based benefit."
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success",
								children: [overview?.distribution_percentage ?? 0, "% released"]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
							children: [(overview?.received_by_benefit ?? []).map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-2xl bg-secondary p-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm font-bold",
										children: item.benefit
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-xs text-muted-foreground",
										children: ["Age ", item.age_range]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-3 text-2xl font-extrabold",
										children: item.received_count
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted-foreground",
										children: "seniors received"
									})
								]
							}, item.benefit)), overview && overview.received_by_benefit.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted-foreground",
								children: "No released benefits yet."
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "surface-card flex h-[430px] flex-col overflow-hidden p-7",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Megaphone, { className: "h-4 w-4" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-lg font-bold",
									children: "Announcements"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex items-center gap-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground",
									children: [announcements.length, " total"]
								})
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-6 min-h-0 flex-1 space-y-3 overflow-y-auto pr-2",
							children: [announcements.slice(0, 5).map((announcement) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								id: `announcement-${announcement.id}`,
								onClick: () => setSelectedAnnouncement(announcement),
								onKeyDown: (event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										setSelectedAnnouncement(announcement);
									}
								},
								role: "button",
								tabIndex: 0,
								className: "cursor-pointer rounded-2xl bg-secondary p-4 transition-shadow hover:shadow-[var(--shadow-soft)]",
								children: [
									announcement.image_path && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: `http://127.0.0.1:8000/storage/${announcement.image_path}`,
										alt: "",
										className: "mb-3 max-h-96 w-full rounded-xl bg-card object-contain"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm font-bold",
										children: announcement.title
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 text-sm text-muted-foreground",
										children: announcement.message
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-2 text-xs text-muted-foreground",
										children: new Date(announcement.published_at).toLocaleDateString()
									})
								]
							}, announcement.id)), !announcements.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted-foreground",
								children: "No current announcements."
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "surface-card h-[430px] overflow-hidden p-7",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-4 w-4" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-lg font-bold",
									children: "Distribution Status"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground",
								children: "Live"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-7 space-y-5",
							children: [
								[
									{
										label: "Received",
										value: overview?.benefits_distributed_count ?? 0,
										color: "bg-success",
										text: "text-success"
									},
									{
										label: "Pending",
										value: overview?.benefits_pending_count ?? 0,
										color: "bg-gold",
										text: "text-gold-foreground"
									},
									{
										label: "Not received",
										value: overview?.benefits_failed_count ?? 0,
										color: "bg-coral",
										text: "text-coral"
									}
								].map((item) => {
									const total = (overview?.benefits_distributed_count ?? 0) + (overview?.benefits_pending_count ?? 0) + (overview?.benefits_failed_count ?? 0);
									const percentage = total > 0 ? Math.round(item.value / total * 100) : 0;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-semibold",
											children: item.label
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: `font-bold ${item.text}`,
											children: item.value
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mt-2 h-2 rounded-full bg-secondary",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: `h-2 rounded-full ${item.color}`,
											style: { width: `${percentage}%` }
										})
									})] }, item.label);
								}),
								!overview && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted-foreground",
									children: "Loading distribution data..."
								}),
								overview && overview.benefits_distributed_count + overview.benefits_pending_count + overview.benefits_failed_count === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted-foreground",
									children: "No benefit transactions recorded yet."
								})
							]
						})]
					})
				]
			}),
			currentUser?.role !== "leader" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
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
							children: "Age Threshold Detection"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted-foreground",
							children: "Derived eligibility surfaced from current senior ages."
						})] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-gold-foreground",
						children: loading ? "Loading..." : `${eligibilityFlags.length} flags to review`
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3",
					children: [
						eligibilityFlags.slice(0, 6).map(({ senior, program, reason }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
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
						!loading && eligibilityFlags.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted-foreground",
							children: "No age threshold flags."
						})
					]
				})]
			}),
			showAnnouncementForm && currentUser?.role === "head" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-30 grid place-items-center bg-black/50 backdrop-blur-[2px] px-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: handleCreateAnnouncement,
					className: "surface-card w-full max-w-2xl overflow-hidden p-0 shadow-2xl",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between border-b border-border px-6 py-5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-2xl font-extrabold",
							children: "Create announcement"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setShowAnnouncementForm(false),
							"aria-label": "Close announcement form",
							className: "grid h-10 w-10 place-items-center rounded-full bg-secondary",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-5 w-5" })
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-6",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "bg-navy grid h-11 w-11 place-items-center rounded-full text-primary-foreground",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Megaphone, { className: "h-5 w-5" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm font-bold",
									children: "Bulan SeniorCare"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: "Head announcement"
								})] })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								required: true,
								maxLength: 180,
								value: announcementTitle,
								onChange: (event) => setAnnouncementTitle(event.target.value),
								placeholder: "Announcement title",
								className: "mt-6 w-full border-b border-border bg-transparent py-3 text-lg outline-none placeholder:text-muted-foreground"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								required: true,
								maxLength: 5e3,
								value: announcementMessage,
								onChange: (event) => setAnnouncementMessage(event.target.value),
								placeholder: "What's the announcement?",
								rows: 6,
								className: "mt-3 w-full resize-none bg-transparent py-3 text-lg outline-none placeholder:text-muted-foreground"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-semibold",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImagePlus, { className: "h-5 w-5 text-gold-foreground" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "flex-1",
										children: "Add poster image"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "file",
										accept: "image/jpeg,image/png,image/webp",
										onChange: (event) => setAnnouncementImage(event.target.files?.[0] ?? null),
										className: "hidden"
									})
								]
							}),
							announcementImagePreview && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: announcementImagePreview,
								alt: "Poster preview",
								className: "mt-3 max-h-56 w-full rounded-xl object-cover"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 rounded-xl border border-border px-4 py-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm font-semibold",
									children: "Post to dashboard"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-xs text-muted-foreground",
									children: "Everyone with portal access can view this announcement."
								})]
							}),
							announcementError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-4 text-sm font-medium text-destructive",
								children: announcementError
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "submit",
								disabled: announcementSaving,
								className: "bg-navy mt-5 w-full rounded-xl py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60",
								children: announcementSaving ? "Publishing..." : "Publish announcement"
							})
						]
					})]
				})
			}),
			selectedAnnouncement && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-30 grid place-items-center bg-black/50 backdrop-blur-[2px] px-4",
				onClick: () => setSelectedAnnouncement(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					role: "dialog",
					"aria-modal": "true",
					"aria-labelledby": "announcement-preview-title",
					onClick: (event) => event.stopPropagation(),
					className: "surface-card max-h-[90vh] w-full max-w-3xl overflow-y-auto p-0 shadow-2xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between border-b border-border px-6 py-5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-bold text-muted-foreground",
								children: "Announcement preview"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setSelectedAnnouncement(null),
								"aria-label": "Close announcement preview",
								className: "grid h-10 w-10 place-items-center rounded-full bg-secondary",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-5 w-5" })
							})]
						}),
						selectedAnnouncement.image_path && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: `http://127.0.0.1:8000/storage/${selectedAnnouncement.image_path}`,
							alt: "",
							className: "max-h-[65vh] w-full object-contain"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-6",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									id: "announcement-preview-title",
									className: "text-2xl font-extrabold",
									children: selectedAnnouncement.title
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-4 whitespace-pre-wrap text-base leading-relaxed text-muted-foreground",
									children: selectedAnnouncement.message
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-5 text-sm text-muted-foreground",
									children: new Date(selectedAnnouncement.published_at).toLocaleDateString()
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-6 border-t border-border pt-5",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
											className: "text-lg font-bold",
											children: "Comments"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-3 space-y-3",
											children: [selectedAnnouncement.comments?.map((comment) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "rounded-xl bg-secondary p-3",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center justify-between gap-3",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
															className: "text-sm font-bold",
															children: comment.user.name
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
															className: "text-xs text-muted-foreground",
															children: comment.user.role
														})]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
														className: "mt-1 text-sm text-muted-foreground",
														children: comment.message
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
														type: "button",
														onClick: () => setReplyTo((current) => current === comment.id ? null : comment.id),
														className: "mt-2 inline-flex items-center gap-1 text-xs font-bold text-foreground",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CornerUpLeft, { className: "h-3.5 w-3.5" }), " Reply"]
													}),
													comment.replies?.map((reply) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "mt-3 ml-5 rounded-xl border-l-2 border-border bg-card p-3",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "flex items-center justify-between gap-3",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
																className: "text-xs font-bold",
																children: reply.user.name
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
																className: "text-[11px] text-muted-foreground",
																children: reply.user.role
															})]
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
															className: "mt-1 text-sm text-muted-foreground",
															children: reply.message
														})]
													}, reply.id)),
													replyTo === comment.id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
														onSubmit: (event) => handleCreateComment(event, comment.id),
														className: "mt-3 ml-5 flex gap-2",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
															required: true,
															maxLength: 2e3,
															autoFocus: true,
															value: replyMessage,
															onChange: (event) => setReplyMessage(event.target.value),
															placeholder: `Reply to ${comment.user.name}`,
															className: "min-w-0 flex-1 rounded-xl bg-card px-3 py-2 text-sm outline-none"
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
															type: "submit",
															disabled: commentSaving,
															className: "bg-navy rounded-xl px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60",
															children: commentSaving ? "Sending..." : "Reply"
														})]
													})
												]
											}, comment.id)), !selectedAnnouncement.comments?.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-sm text-muted-foreground",
												children: "No comments yet."
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
											onSubmit: handleCreateComment,
											className: "mt-4 flex gap-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												required: true,
												maxLength: 2e3,
												value: commentMessage,
												onChange: (event) => setCommentMessage(event.target.value),
												placeholder: "Write a comment...",
												className: "min-w-0 flex-1 rounded-xl bg-secondary px-4 py-3 text-sm outline-none"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "submit",
												disabled: commentSaving,
												className: "bg-navy rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60",
												children: commentSaving ? "Sending..." : "Send"
											})]
										})
									]
								})
							]
						})
					]
				})
			})
		]
	});
}
//#endregion
export { Dashboard as component };
