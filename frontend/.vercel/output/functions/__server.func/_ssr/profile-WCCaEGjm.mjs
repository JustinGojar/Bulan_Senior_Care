import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { b as getStoredUser, i as apiFetch, j as setStoredUser, o as clearToken, r as API_URL, w as logout } from "./router-D67W07gD.mjs";
import { M as KeyRound, R as Eye, Y as CircleUser, at as Camera, k as LogOut, y as Save, z as EyeOff } from "../_libs/lucide-react.mjs";
import { r as osca_admin_default, t as AppShell } from "./AppShell-CSdz8EAS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/profile-WCCaEGjm.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ProfilePage() {
	const [user, setUser] = (0, import_react.useState)(getStoredUser());
	const [name, setName] = (0, import_react.useState)(user?.name ?? "");
	const [email, setEmail] = (0, import_react.useState)(user?.email ?? "");
	const [contact, setContact] = (0, import_react.useState)(user?.contact_number ?? "");
	const [assignedBarangay, setAssignedBarangay] = (0, import_react.useState)("");
	const [photo, setPhoto] = (0, import_react.useState)(null);
	const [photoPreview, setPhotoPreview] = (0, import_react.useState)(null);
	const [currentPassword, setCurrentPassword] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [passwordConfirmation, setPasswordConfirmation] = (0, import_react.useState)("");
	const [showPasswords, setShowPasswords] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		apiFetch("/user").then((freshUser) => {
			setUser(freshUser);
			setName(freshUser.name);
			setEmail(freshUser.email);
			setContact(freshUser.contact_number ?? "");
			setStoredUser(freshUser);
			if (freshUser.role === "leader" && freshUser.barangay_id) apiFetch("/barangays").then((barangays) => setAssignedBarangay(barangays.find((barangay) => barangay.id === freshUser.barangay_id)?.barangay_name ?? "")).catch(() => setAssignedBarangay(""));
		}).catch((error) => {
			if (error.message.includes("session has expired")) {
				toast.error(error.message);
				window.location.href = "/login";
			}
		});
	}, []);
	(0, import_react.useEffect)(() => {
		if (!photo) {
			setPhotoPreview(null);
			return;
		}
		const previewUrl = URL.createObjectURL(photo);
		setPhotoPreview(previewUrl);
		return () => URL.revokeObjectURL(previewUrl);
	}, [photo]);
	const photoUrl = photoPreview ?? (user?.profile_photo_path ? `${API_URL.replace(/\/api$/, "")}/storage/${user.profile_photo_path}` : user?.role?.toLowerCase() === "admin" || user?.roles?.some((role) => role.name.toLowerCase() === "admin") ? "/assets/osca_admin-Cn9HCsAS.jpg" : null);
	const roleLabel = user?.role?.toLowerCase() === "leader" ? `BSCA${assignedBarangay ? ` - ${assignedBarangay}` : ""}` : user?.role ?? "user";
	const initials = (name || "User").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
	async function saveProfile(event) {
		event.preventDefault();
		setBusy(true);
		try {
			const form = new FormData();
			form.append("name", name);
			form.append("email", email);
			form.append("contact_number", contact);
			if (photo) form.append("profile_photo", photo);
			const updated = await apiFetch("/profile", {
				method: "POST",
				body: form
			});
			setUser(updated);
			setStoredUser(updated);
			setPhoto(null);
			toast.success("Profile updated successfully.");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Could not update profile.");
			if (error instanceof Error && error.message.includes("session has expired")) window.location.href = "/login";
		} finally {
			setBusy(false);
		}
	}
	async function savePassword(event) {
		event.preventDefault();
		setBusy(true);
		try {
			await apiFetch("/profile/password", {
				method: "POST",
				body: JSON.stringify({
					current_password: currentPassword,
					password,
					password_confirmation: passwordConfirmation
				})
			});
			setCurrentPassword("");
			setPassword("");
			setPasswordConfirmation("");
			toast.success("Password changed successfully.");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Could not change password.");
		} finally {
			setBusy(false);
		}
	}
	async function signOut() {
		logout().catch(() => void 0);
		clearToken();
		window.location.href = "/login";
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "My Profile",
		subtitle: "Manage your account details and security",
		breadcrumb: ["Dashboard", "My Profile"],
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-6 lg:grid-cols-[0.8fr_1.2fr]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "surface-card flex min-h-[640px] flex-col p-7",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col items-center text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative grid h-28 w-28 overflow-hidden place-items-center rounded-full bg-navy text-2xl font-bold text-primary-foreground ring-4 ring-gold/50",
							children: [photoUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: photoUrl,
								alt: "Profile",
								className: "h-full w-full object-cover",
								onError: (event) => {
									if (user?.role?.toLowerCase() === "admin" || user?.roles?.some((role) => role.name.toLowerCase() === "admin")) event.currentTarget.src = osca_admin_default;
								}
							}) : initials, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								htmlFor: "profile-photo",
								className: "absolute right-1 bottom-1 grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-gold text-gold-foreground shadow-lg",
								title: "Change profile picture",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "h-4 w-4" })
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "profile-photo",
							type: "file",
							accept: "image/png,image/jpeg,image/webp",
							className: "hidden",
							onChange: (event) => setPhoto(event.target.files?.[0] ?? null)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-5 text-xl font-bold",
							children: user?.name ?? "Your profile"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted-foreground",
							children: user?.email
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-4 rounded-full bg-secondary px-4 py-1.5 text-xs font-bold uppercase",
							children: roleLabel
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: signOut,
					className: "mt-auto flex w-full items-center justify-center gap-2 rounded-full bg-destructive/10 py-3 text-sm font-bold text-destructive",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "h-4 w-4" }), " Log out"]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: saveProfile,
					className: "surface-card p-7",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleUser, { className: "h-5 w-5 text-gold-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-lg font-bold",
								children: "Personal information"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-6 grid gap-5 sm:grid-cols-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "text-sm font-semibold",
									children: ["Full name", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: name,
										onChange: (event) => setName(event.target.value),
										className: "mt-2 h-12 w-full rounded-xl bg-secondary px-4 outline-none focus:ring-2 focus:ring-ring/30",
										required: true
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "text-sm font-semibold",
									children: ["Email address", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "email",
										value: email,
										onChange: (event) => setEmail(event.target.value),
										className: "mt-2 h-12 w-full rounded-xl bg-secondary px-4 outline-none focus:ring-2 focus:ring-ring/30",
										required: true
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "text-sm font-semibold sm:col-span-2",
									children: ["Contact number", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: contact,
										onChange: (event) => setContact(event.target.value),
										placeholder: "0917-123-4567",
										className: "mt-2 h-12 w-full rounded-xl bg-secondary px-4 outline-none focus:ring-2 focus:ring-ring/30"
									})]
								}),
								user?.role === "leader" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "text-sm font-semibold sm:col-span-2",
									children: ["Assigned barangay", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: assignedBarangay || "Not assigned",
										readOnly: true,
										className: "mt-2 h-12 w-full cursor-not-allowed rounded-xl bg-secondary px-4 text-muted-foreground outline-none"
									})]
								})
							]
						}),
						photo && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-4 text-xs text-muted-foreground",
							children: [
								"Preview updated. Click Save profile to upload ",
								photo.name,
								"."
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "submit",
							disabled: busy,
							className: "bg-navy mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-4 w-4" }),
								" ",
								busy ? "Saving..." : "Save profile"
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: savePassword,
					className: "surface-card p-7",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "h-5 w-5 text-gold-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-lg font-bold",
								children: "Change password"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-6 flex items-center justify-end",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setShowPasswords((visible) => !visible),
								className: "inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground",
								children: [showPasswords ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-4 w-4" }), showPasswords ? "Hide passwords" : "Show passwords"]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 grid gap-5 sm:grid-cols-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "text-sm font-semibold",
									children: ["Current password", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: showPasswords ? "text" : "password",
										value: currentPassword,
										onChange: (event) => setCurrentPassword(event.target.value),
										className: "mt-2 h-12 w-full rounded-xl bg-secondary px-4 outline-none focus:ring-2 focus:ring-ring/30",
										required: true
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "text-sm font-semibold",
									children: ["New password", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: showPasswords ? "text" : "password",
										value: password,
										onChange: (event) => setPassword(event.target.value),
										minLength: 8,
										className: "mt-2 h-12 w-full rounded-xl bg-secondary px-4 outline-none focus:ring-2 focus:ring-ring/30",
										required: true
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "text-sm font-semibold",
									children: ["Confirm password", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: showPasswords ? "text" : "password",
										value: passwordConfirmation,
										onChange: (event) => setPasswordConfirmation(event.target.value),
										minLength: 8,
										className: "mt-2 h-12 w-full rounded-xl bg-secondary px-4 outline-none focus:ring-2 focus:ring-ring/30",
										required: true
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "submit",
							disabled: busy,
							className: "bg-navy mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "h-4 w-4" }),
								" ",
								busy ? "Updating..." : "Update password"
							]
						})
					]
				})]
			})]
		})
	});
}
//#endregion
export { ProfilePage as component };
