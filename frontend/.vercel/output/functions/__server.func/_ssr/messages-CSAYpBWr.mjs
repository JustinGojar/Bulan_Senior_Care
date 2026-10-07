import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { A as sendMessage, T as markMessageRead, b as getStoredUser, g as getMessages, h as getMessageRecipients, u as deleteConversation, x as getToken } from "./router-D67W07gD.mjs";
import { $ as ChevronLeft, B as Ellipsis, C as PenLine, N as Image, _ as Send, dt as ArrowLeft, f as Smile, v as Search, x as Plus } from "../_libs/lucide-react.mjs";
import { t as AppShell } from "./AppShell-CSdz8EAS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/messages-CSAYpBWr.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function MessagesPage() {
	const currentUser = getStoredUser();
	currentUser?.role;
	const canMessage = [
		"admin",
		"leader",
		"head"
	].includes(currentUser?.role ?? "");
	const [messages, setMessages] = (0, import_react.useState)([]);
	const [currentPage, setCurrentPage] = (0, import_react.useState)(1);
	const [lastPage, setLastPage] = (0, import_react.useState)(1);
	const [messagesLoading, setMessagesLoading] = (0, import_react.useState)(true);
	const [recipients, setRecipients] = (0, import_react.useState)([]);
	const [recipientSearch, setRecipientSearch] = (0, import_react.useState)("");
	const [recipientSearching, setRecipientSearching] = (0, import_react.useState)(false);
	const [recipient, setRecipient] = (0, import_react.useState)(null);
	const [subject, setSubject] = (0, import_react.useState)("");
	const [message, setMessage] = (0, import_react.useState)("");
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [search, setSearch] = (0, import_react.useState)("");
	const [filter, setFilter] = (0, import_react.useState)("All");
	const [composerOpen, setComposerOpen] = (0, import_react.useState)(false);
	const [selectedConversation, setSelectedConversation] = (0, import_react.useState)(null);
	const [reply, setReply] = (0, import_react.useState)("");
	const [sendingReply, setSendingReply] = (0, import_react.useState)(false);
	const [contextConversation, setContextConversation] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (!currentUser || !getToken()) {
			window.location.href = "/login";
			return;
		}
		setMessagesLoading(true);
		getMessages(currentPage).then((result) => {
			setMessages(result.data.filter((item) => item.sender?.id && item.recipient?.id));
			setLastPage(result.last_page);
		}).catch(() => {
			setMessages([]);
			if (!getToken()) window.location.href = "/login";
		}).finally(() => setMessagesLoading(false));
	}, [currentPage]);
	(0, import_react.useEffect)(() => {
		const timer = window.setTimeout(() => {
			setRecipientSearching(true);
			getMessageRecipients(recipientSearch).then(setRecipients).catch(() => setRecipients([])).finally(() => setRecipientSearching(false));
		}, 250);
		return () => window.clearTimeout(timer);
	}, [recipientSearch]);
	async function handleSend(event) {
		event.preventDefault();
		setSaving(true);
		try {
			if (!recipient) return;
			const sent = await sendMessage(recipient.id, subject, message);
			setMessages((current) => [sent, ...current]);
			setSubject("");
			setMessage("");
			setRecipient(null);
			setRecipientSearch("");
			toast.success(`Message sent to ${sent.recipient.name}.`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Unable to send message.");
		} finally {
			setSaving(false);
		}
	}
	async function openMessage(item) {
		setSelectedConversation(item);
		if (item.recipient.id !== currentUser?.id || item.read_at) return;
		try {
			const updated = await markMessageRead(item.id);
			setMessages((current) => current.map((messageItem) => messageItem.id === updated.id ? updated : messageItem));
			window.dispatchEvent(new Event("bulan-unread-updated"));
		} catch {
			toast.error("Unable to mark message as read.");
		}
	}
	async function sendReply(event) {
		event.preventDefault();
		if (!selectedConversation || !reply.trim()) return;
		const other = selectedConversation.sender.id === currentUser?.id ? selectedConversation.recipient : selectedConversation.sender;
		setSendingReply(true);
		try {
			const sent = await sendMessage(other.id, selectedConversation.subject, reply.trim());
			setMessages((current) => [sent, ...current]);
			setSelectedConversation(sent);
			setReply("");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Unable to send reply.");
		} finally {
			setSendingReply(false);
		}
	}
	async function removeConversation(item) {
		const other = item.sender.id === currentUser?.id ? item.recipient : item.sender;
		try {
			await deleteConversation(other.id);
			setMessages((current) => current.filter((messageItem) => {
				const participants = [messageItem.sender.id, messageItem.recipient.id];
				return !(participants.includes(other.id) && participants.includes(currentUser?.id ?? -1));
			}));
			if (selectedConversation && [selectedConversation.sender.id, selectedConversation.recipient.id].includes(other.id)) setSelectedConversation(null);
			setContextConversation(null);
			toast.success("Conversation deleted.");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Unable to delete conversation.");
		}
	}
	const conversations = Array.from(messages.reduce((grouped, item) => {
		const other = item.sender.id === currentUser?.id ? item.recipient : item.sender;
		if (!grouped.has(other.id)) grouped.set(other.id, []);
		grouped.get(other.id)?.push(item);
		return grouped;
	}, /* @__PURE__ */ new Map())).map(([, items]) => items);
	const visibleMessages = conversations.map((items) => items[0]).filter((item) => {
		const matchesSearch = [
			(item.sender.id === currentUser?.id ? item.recipient : item.sender).name,
			item.subject,
			item.message
		].some((value) => value.toLowerCase().includes(search.toLowerCase()));
		if (filter === "Unread") {
			const conversation = conversations.find((items) => items.includes(item)) ?? [];
			return matchesSearch && conversation.some((messageItem) => messageItem.recipient.id === currentUser?.id && !messageItem.read_at);
		}
		return matchesSearch;
	});
	function avatarLabel(name) {
		return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, {
		title: "Chats",
		subtitle: "Messages",
		breadcrumb: ["Dashboard", "Inbox"],
		actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				"aria-label": "More chat options",
				title: "More options",
				className: "grid h-10 w-10 place-items-center rounded-full bg-card shadow-[var(--shadow-soft)]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, { className: "h-5 w-5" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setComposerOpen((open) => !open),
				"aria-label": "New message",
				title: "New message",
				className: "bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground shadow-[var(--shadow-soft)]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PenLine, { className: "h-4 w-4" })
			})]
		}),
		children: [composerOpen && canMessage && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: handleSend,
			className: "surface-card mb-5 p-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-bold",
						children: "New message"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: "Search BSCA and OSCA Head accounts by name or email."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setComposerOpen(false),
						"aria-label": "Close new message",
						className: "grid h-9 w-9 place-items-center rounded-full bg-secondary",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "h-4 w-4 rotate-90" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 grid gap-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: recipient ? `${recipient.name} · ${recipient.email}` : recipientSearch,
									onChange: (event) => {
										setRecipient(null);
										setRecipientSearch(event.target.value);
									},
									placeholder: "Search BSCA or OSCA Head by name or email",
									className: "h-12 w-full rounded-xl border border-border bg-transparent pr-4 pl-11 text-sm outline-none focus:ring-2 focus:ring-ring/30"
								}),
								!recipient && recipientSearch && recipients.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "surface-card absolute top-14 right-0 left-0 z-10 max-h-56 overflow-y-auto p-2",
									children: recipients.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => {
											setRecipient(item);
											setRecipientSearch("");
										},
										className: "flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-secondary",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
											className: "block text-sm",
											children: item.name
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", {
											className: "text-xs text-muted-foreground",
											children: item.email
										})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", {
											className: "text-xs font-semibold capitalize text-muted-foreground",
											children: item.role
										})]
									}, item.id))
								}),
								!recipient && recipientSearch && recipientSearching && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 text-xs text-muted-foreground",
									children: "Searching accounts..."
								}),
								!recipient && recipientSearch && !recipientSearching && recipients.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 text-xs text-muted-foreground",
									children: "No matching accounts."
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							required: true,
							maxLength: 180,
							value: subject,
							onChange: (event) => setSubject(event.target.value),
							placeholder: "Subject",
							className: "rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							required: true,
							maxLength: 5e3,
							value: message,
							onChange: (event) => setMessage(event.target.value),
							placeholder: "Write your message...",
							rows: 5,
							className: "resize-none rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "submit",
					disabled: saving || !recipient,
					className: "bg-navy mt-5 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "h-4 w-4" }),
						" ",
						saving ? "Sending..." : "Send message"
					]
				})
			]
		}), selectedConversation ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConversationDetail, {
			selected: selectedConversation,
			messages,
			currentUserId: currentUser?.id,
			reply,
			setReply,
			sending: sendingReply,
			onBack: () => setSelectedConversation(null),
			onSubmit: sendReply
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "surface-card overflow-hidden p-4 sm:p-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: search,
						onChange: (event) => setSearch(event.target.value),
						placeholder: "Search Messenger",
						className: "h-12 w-full rounded-full bg-secondary pr-4 pl-12 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-5 flex gap-2 overflow-x-auto pb-1",
					children: ["All", "Unread"].map((tab) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setFilter(tab),
						className: `shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${filter === tab ? "bg-navy text-primary-foreground" : "text-foreground hover:bg-secondary"}`,
						children: tab
					}, tab))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 divide-y divide-border",
					children: [
						messagesLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "px-2 py-12 text-center text-sm text-muted-foreground",
							children: "Loading conversations..."
						}),
						visibleMessages.map((item) => {
							const received = item.recipient.id === currentUser?.id;
							const other = received ? item.sender : item.recipient;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
								onClick: () => openMessage(item),
								onContextMenu: (event) => {
									event.preventDefault();
									setContextConversation(item);
								},
								className: "relative flex cursor-pointer items-center gap-3 px-1 py-4 transition-colors hover:bg-secondary/60 sm:gap-4 sm:px-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "bg-navy relative grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-bold text-primary-foreground sm:h-14 sm:w-14",
										children: [avatarLabel(other.name), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute right-0 bottom-0 h-3.5 w-3.5 rounded-full border-2 border-card bg-success" })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-baseline justify-between gap-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: `truncate text-base ${received && !item.read_at ? "font-extrabold" : "font-semibold"}`,
												children: other.name
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "shrink-0 text-xs text-muted-foreground",
												children: new Date(item.created_at).toLocaleDateString(void 0, {
													month: "short",
													day: "numeric"
												})
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: `mt-1 truncate text-sm ${received && !item.read_at ? "font-semibold text-foreground" : "text-muted-foreground"}`,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-medium",
												children: [item.subject, ": "]
											}), item.message]
										})]
									}),
									received && !item.read_at && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-3.5 w-3.5 shrink-0 rounded-full bg-navy" }),
									contextConversation?.id === item.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "surface-card absolute right-2 bottom-2 z-10 w-44 p-1 shadow-[var(--shadow-card)]",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => removeConversation(item),
											className: "w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-destructive hover:bg-destructive/10",
											children: "Delete conversation"
										})
									})
								]
							}, item.id);
						}),
						!messagesLoading && !visibleMessages.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "px-2 py-12 text-center text-sm text-muted-foreground",
							children: "No conversations found."
						})
					]
				}),
				lastPage > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5 flex items-center justify-between gap-3 border-t border-border pt-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted-foreground",
						children: [
							"Page ",
							currentPage,
							" of ",
							lastPage
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: currentPage === 1 || messagesLoading,
							onClick: () => setCurrentPage((page) => page - 1),
							className: "rounded-full px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-40",
							children: "Previous"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: currentPage === lastPage || messagesLoading,
							onClick: () => setCurrentPage((page) => page + 1),
							className: "rounded-full bg-navy px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40",
							children: "Next"
						})]
					})]
				})
			]
		})]
	});
}
function ConversationDetail({ selected, messages, currentUserId, reply, setReply, sending, onBack, onSubmit }) {
	const other = selected.sender.id === currentUserId ? selected.recipient : selected.sender;
	const conversation = messages.filter((item) => {
		const participants = [item.sender.id, item.recipient.id];
		return participants.includes(other.id) && participants.includes(currentUserId ?? -1);
	}).sort((first, second) => new Date(first.created_at).getTime() - new Date(second.created_at).getTime());
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "surface-card flex h-[calc(100vh-9rem)] min-h-[560px] flex-col overflow-hidden",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onBack,
						"aria-label": "Back to conversations",
						title: "Back",
						className: "grid h-9 w-9 place-items-center rounded-full hover:bg-secondary",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-5 w-5" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-navy relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold text-primary-foreground",
						children: [other.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute right-0 bottom-0 h-3.5 w-3.5 rounded-full border-2 border-card bg-success" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "truncate text-base font-extrabold",
							children: other.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: "Active now"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-center gap-1 text-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "More options",
							title: "More options",
							className: "grid h-9 w-9 place-items-center rounded-full hover:bg-secondary",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, { className: "h-5 w-5" })
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 space-y-3 overflow-y-auto bg-card px-4 py-6 sm:px-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "pb-3 text-center text-xs text-muted-foreground",
						children: "Today"
					}),
					conversation.map((item) => {
						const mine = item.sender.id === currentUserId;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: `flex ${mine ? "justify-end" : "justify-start"}`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: `max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[60%] ${mine ? "rounded-br-md bg-navy text-primary-foreground" : "rounded-bl-md bg-navy/10 text-foreground"}`,
								children: [
									!mine && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mb-1 text-xs font-bold text-muted-foreground",
										children: item.sender.name
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "whitespace-pre-wrap",
										children: item.message
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: `mt-1 text-[10px] ${mine ? "text-white/70" : "text-muted-foreground"}`,
										children: new Date(item.created_at).toLocaleTimeString([], {
											hour: "numeric",
											minute: "2-digit"
										})
									})
								]
							})
						}, item.id);
					}),
					!conversation.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-center text-sm text-muted-foreground",
						children: "No messages in this conversation yet."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit,
				className: "flex items-center gap-2 border-t border-border bg-card px-3 py-3 sm:px-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": "Add attachment",
						title: "Add attachment",
						className: "grid h-9 w-9 shrink-0 place-items-center rounded-full text-foreground hover:bg-secondary",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-5 w-5" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": "Add photo",
						title: "Add photo",
						className: "hidden h-9 w-9 shrink-0 place-items-center rounded-full text-foreground hover:bg-secondary sm:grid",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Image, { className: "h-5 w-5" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex min-w-0 flex-1 items-center rounded-full bg-secondary px-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: reply,
							onChange: (event) => setReply(event.target.value),
							placeholder: "Aa",
							className: "h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "Add emoji",
							title: "Add emoji",
							className: "text-foreground",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smile, { className: "h-5 w-5" })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						disabled: sending || !reply.trim(),
						"aria-label": "Send reply",
						title: "Send reply",
						className: "bg-navy grid h-10 w-10 shrink-0 place-items-center rounded-full text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "h-4 w-4" })
					})
				]
			})
		]
	});
}
//#endregion
export { MessagesPage as component };
