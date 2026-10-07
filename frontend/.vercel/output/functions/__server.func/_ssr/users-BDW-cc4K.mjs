import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { N as updateManagedUser, b as getStoredUser, d as deleteManagedUser, i as apiFetch, l as createBarangayLeader, m as getManagedUsers, r as API_URL } from "./router-D67W07gD.mjs";
import { R as Eye, S as Pencil, i as UserCog, r as UserPlus, t as X, u as Trash2, z as EyeOff } from "../_libs/lucide-react.mjs";
import { r as osca_admin_default, t as AppShell } from "./AppShell-CSdz8EAS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/users-BDW-cc4K.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function getAge(birthdate) {
	if (!birthdate) return "";
	const today = /* @__PURE__ */ new Date();
	const date = /* @__PURE__ */ new Date(`${birthdate}T00:00:00`);
	let age = today.getFullYear() - date.getFullYear();
	if (today.getMonth() < date.getMonth() || today.getMonth() === date.getMonth() && today.getDate() < date.getDate()) age -= 1;
	return age >= 0 ? String(age) : "";
}
function initials(name) {
	return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
function UserManagement() {
	const currentUser = getStoredUser();
	const [users, setUsers] = (0, import_react.useState)([]);
	const [showCreateForm, setShowCreateForm] = (0, import_react.useState)(false);
	const [editingUser, setEditingUser] = (0, import_react.useState)(null);
	const [firstName, setFirstName] = (0, import_react.useState)("");
	const [middleName, setMiddleName] = (0, import_react.useState)("");
	const [lastName, setLastName] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [contactNumber, setContactNumber] = (0, import_react.useState)("");
	const [birthdate, setBirthdate] = (0, import_react.useState)("");
	const [barangayId, setBarangayId] = (0, import_react.useState)("");
	const [barangays, setBarangays] = (0, import_react.useState)([]);
	const [password, setPassword] = (0, import_react.useState)("");
	const [passwordConfirmation, setPasswordConfirmation] = (0, import_react.useState)("");
	const [showPassword, setShowPassword] = (0, import_react.useState)(false);
	const [showPasswordConfirmation, setShowPasswordConfirmation] = (0, import_react.useState)(false);
	const [role, setRole] = (0, import_react.useState)("leader");
	const [status, setStatus] = (0, import_react.useState)("active");
	const [error, setError] = (0, import_react.useState)(null);
	const [submitting, setSubmitting] = (0, import_react.useState)(false);
	const isAdmin = currentUser?.role === "admin";
	(0, import_react.useEffect)(() => {
		getManagedUsers().then(setUsers).catch(() => setUsers([]));
		apiFetch("/barangays").then(setBarangays).catch(() => setBarangays([]));
	}, []);
	if (!isAdmin) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Access restricted",
		subtitle: "User Management is available to Admin accounts only",
		breadcrumb: ["Dashboard"],
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "surface-card p-7",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "You do not have permission to view user management."
			})
		})
	});
	function resetForm() {
		setFirstName("");
		setMiddleName("");
		setLastName("");
		setEmail("");
		setContactNumber("");
		setBirthdate("");
		setBarangayId("");
		setPassword("");
		setPasswordConfirmation("");
		setShowPassword(false);
		setShowPasswordConfirmation(false);
		setRole("leader");
		setStatus("active");
		setEditingUser(null);
	}
	function openEditForm(user) {
		setEditingUser(user);
		setFirstName(user.first_name ?? "");
		setMiddleName(user.middle_name ?? "");
		setLastName(user.last_name ?? "");
		setEmail(user.email);
		setContactNumber(user.contact_number ?? "");
		setBirthdate(user.birthdate ?? "");
		setBarangayId(user.barangay_id ? String(user.barangay_id) : "");
		setRole(user.role);
		setStatus(user.status);
		setError(null);
		setShowCreateForm(true);
	}
	async function handleSubmit(event) {
		event.preventDefault();
		setError(null);
		if (password && (!/(?=.*[a-z])/.test(password) || !/(?=.*[A-Z])/.test(password) || !/(?=.*\d)/.test(password) || !/(?=.*[^A-Za-z0-9])/.test(password) || password.length < 8)) {
			setError("Password must be at least 8 characters and include uppercase, lowercase, number, and special character.");
			return;
		}
		setSubmitting(true);
		try {
			if (editingUser) {
				const updated = await updateManagedUser(editingUser.id, {
					name: [
						firstName,
						middleName,
						lastName
					].filter(Boolean).join(" ") || editingUser.name,
					first_name: firstName || null,
					middle_name: middleName || null,
					last_name: lastName || null,
					email,
					contact_number: contactNumber || null,
					birthdate: birthdate || null,
					barangay_id: barangayId ? Number(barangayId) : null,
					role,
					status,
					password: password || void 0,
					password_confirmation: passwordConfirmation || void 0
				});
				setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
				toast.success("User account updated.");
			} else {
				const leader = await createBarangayLeader({
					firstName,
					middleName,
					lastName,
					email,
					contactNumber,
					birthdate,
					barangayId: Number(barangayId),
					password,
					passwordConfirmation
				});
				setUsers((current) => [...current, leader]);
				toast.success("BSCA / Barangay Senior Citizen Affairs account created.");
			}
			resetForm();
			setShowCreateForm(false);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : "Unable to create account.");
		} finally {
			setSubmitting(false);
		}
	}
	async function handleDelete(user) {
		if (!window.confirm(`Delete the account for ${user.name}?`)) return;
		try {
			await deleteManagedUser(user.id);
			setUsers((current) => current.filter((item) => item.id !== user.id));
			toast.success("User account deleted.");
		} catch (reason) {
			toast.error(reason instanceof Error ? reason.message : "Unable to delete account.");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, {
		title: "User Management",
		subtitle: "Manage login accounts and barangay access",
		breadcrumb: ["Dashboard", "User Management"],
		actions: isAdmin ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			onClick: () => setShowCreateForm(true),
			className: "bg-navy rounded-full px-6 py-3.5 text-sm font-semibold text-primary-foreground",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserPlus, { className: "mr-2 inline h-4 w-4" }), " Create BSCA / Barangay Senior Citizen Affairs"]
		}) : void 0,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "surface-card p-7",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserCog, { className: "h-4 w-4" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-bold",
					children: "Login accounts"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Role enforcement belongs on the API; this view mirrors the approved accounts."
				})] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-6 overflow-x-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[720px] text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", {
						className: "text-left",
						children: [
							"Name",
							"Email",
							"Role",
							"Barangay scope",
							"Status",
							"Action"
						].map((heading) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-4 py-3 font-bold",
							children: heading
						}, heading))
					}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: users.map((user) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-border",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-4 font-semibold",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "bg-navy grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full text-xs text-primary-foreground",
										children: user.profile_photo_path ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
											src: `${API_URL.replace(/\/api$/, "")}/storage/${user.profile_photo_path}`,
											alt: `${user.name} profile`,
											className: "h-full w-full object-cover",
											onError: (event) => {
												if (user.role === "admin") event.currentTarget.src = osca_admin_default;
											}
										}) : user.role === "admin" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
											src: osca_admin_default,
											alt: `${user.name} profile`,
											className: "h-full w-full object-cover"
										}) : initials(user.name)
									}), user.name]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-4 text-muted-foreground",
								children: user.email
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-4",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "rounded-full bg-secondary px-3 py-1 text-xs font-bold",
									children: user.role
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-4 text-muted-foreground",
								children: user.role === "leader" ? barangays.find((item) => item.id === user.barangay_id)?.barangay_name ?? "Unassigned" : "All barangays"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: `px-4 py-4 font-bold ${user.status === "active" ? "text-success" : "text-destructive"}`,
								children: user.status
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-4",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => openEditForm(user),
										"aria-label": `Edit ${user.name}`,
										className: "grid h-9 w-9 place-items-center rounded-full bg-secondary",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-4 w-4" })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => handleDelete(user),
										"aria-label": `Delete ${user.name}`,
										className: "grid h-9 w-9 place-items-center rounded-full bg-secondary text-destructive",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
									})]
								})
							})
						]
					}, user.id)) })]
				})
			})]
		}), showCreateForm && isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "fixed inset-0 z-30 grid place-items-center bg-black/50 backdrop-blur-[2px] px-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "surface-card w-full max-w-lg p-7",
				onSubmit: handleSubmit,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-xl font-bold",
							children: editingUser ? "Edit user account" : "Create BSCA / Barangay Senior Citizen Affairs account"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted-foreground",
							children: "Only Admin can manage these accounts."
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setShowCreateForm(false),
							"aria-label": "Close create account form",
							className: "grid h-9 w-9 place-items-center rounded-full bg-secondary",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 grid gap-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid gap-4 sm:grid-cols-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										required: true,
										value: firstName,
										onChange: (event) => setFirstName(event.target.value),
										placeholder: "First name",
										className: "rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: middleName,
										onChange: (event) => setMiddleName(event.target.value),
										placeholder: "Middle name",
										className: "rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										required: true,
										value: lastName,
										onChange: (event) => setLastName(event.target.value),
										placeholder: "Last name",
										className: "rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								required: true,
								type: "email",
								value: email,
								onChange: (event) => setEmail(event.target.value),
								placeholder: "Email address",
								className: "rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								required: !editingUser,
								type: "tel",
								value: contactNumber,
								onChange: (event) => setContactNumber(event.target.value),
								placeholder: "Phone / mobile number",
								className: "rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid gap-4 sm:grid-cols-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "rounded-xl border border-border px-4 py-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block text-xs font-semibold text-muted-foreground",
										children: "Birthday"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										required: !editingUser,
										type: "date",
										value: birthdate,
										onChange: (event) => setBirthdate(event.target.value),
										className: "mt-1 w-full bg-transparent text-sm outline-none"
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "rounded-xl border border-border px-4 py-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block text-xs font-semibold text-muted-foreground",
										children: "Age"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: getAge(birthdate),
										readOnly: true,
										placeholder: "Calculated automatically",
										className: "mt-1 w-full bg-transparent text-sm outline-none"
									})]
								})]
							}),
							editingUser && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid gap-4 sm:grid-cols-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									required: true,
									value: role,
									onChange: (event) => setRole(event.target.value),
									className: "rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "admin",
											children: "Admin"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "head",
											children: "Head"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "leader",
											children: "BSCA"
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									required: true,
									value: status,
									onChange: (event) => setStatus(event.target.value),
									className: "rounded-xl border border-border bg-transparent px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/30",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "active",
										children: "Active"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "inactive",
										children: "Inactive"
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "rounded-xl border border-border px-4 py-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-xs font-semibold text-muted-foreground",
									children: "Barangay"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									required: !editingUser || role === "leader",
									value: barangayId,
									onChange: (event) => setBarangayId(event.target.value),
									className: "mt-1 w-full bg-transparent text-sm outline-none",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "",
										children: "No barangay assignment"
									}), barangays.map((barangay) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: barangay.id,
										children: barangay.barangay_name
									}, barangay.id))]
								})]
							}),
							!editingUser && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									minLength: 8,
									required: true,
									type: showPassword ? "text" : "password",
									value: password,
									onChange: (event) => setPassword(event.target.value),
									placeholder: "Password (8+ characters)",
									className: "w-full rounded-xl border border-border bg-transparent px-4 py-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-ring/30 [&::-ms-reveal]:hidden"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setShowPassword((visible) => !visible),
									"aria-label": showPassword ? "Hide password" : "Show password",
									className: "absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground",
									children: showPassword ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-4 w-4" })
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									minLength: 8,
									required: true,
									type: showPasswordConfirmation ? "text" : "password",
									value: passwordConfirmation,
									onChange: (event) => setPasswordConfirmation(event.target.value),
									placeholder: "Confirm new password",
									className: "w-full rounded-xl border border-border bg-transparent px-4 py-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-ring/30 [&::-ms-reveal]:hidden"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setShowPasswordConfirmation((visible) => !visible),
									"aria-label": showPasswordConfirmation ? "Hide confirmation password" : "Show confirmation password",
									className: "absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground",
									children: showPasswordConfirmation ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-4 w-4" })
								})]
							})] })
						]
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-sm font-medium text-destructive",
						children: error
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						disabled: submitting,
						className: "bg-navy mt-6 w-full rounded-full py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60",
						children: submitting ? "Saving..." : editingUser ? "Save changes" : "Create account"
					})
				]
			})
		})]
	});
}
//#endregion
export { UserManagement as component };
