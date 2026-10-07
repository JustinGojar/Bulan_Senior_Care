import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { O as resetPassword } from "./router-D67W07gD.mjs";
import { A as LockKeyhole, R as Eye, z as EyeOff } from "../_libs/lucide-react.mjs";
import { n as ThemeToggle, t as BrandLogo } from "./ThemeToggle-Bhi21hDw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reset-password-DcN8ltWG.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ResetPasswordPage() {
	const navigate = useNavigate();
	const params = new URLSearchParams(window.location.search);
	const token = params.get("token") ?? "";
	const [email, setEmail] = (0, import_react.useState)(params.get("email") ?? "");
	const [password, setPassword] = (0, import_react.useState)("");
	const [passwordConfirmation, setPasswordConfirmation] = (0, import_react.useState)("");
	const [showPassword, setShowPassword] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(token ? null : "This reset link is missing its token.");
	const [submitting, setSubmitting] = (0, import_react.useState)(false);
	function handleSubmit(event) {
		event.preventDefault();
		setSubmitting(true);
		setError(null);
		resetPassword(token, email, password, passwordConfirmation).then(() => navigate({ to: "/login" })).catch((reason) => setError(reason.message)).finally(() => setSubmitting(false));
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "bg-app relative grid min-h-screen place-items-center px-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeToggle, { className: "absolute top-5 right-5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "surface-card w-full max-w-md p-10",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, { className: "h-11 w-11 ring-2 ring-gold/70" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-sm font-bold",
						children: "Bulan SeniorCare"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: "OSCA - Municipality of Bulan"
					})] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-12 text-4xl font-extrabold",
					children: "Create new password"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm leading-relaxed text-muted-foreground",
					children: "Use at least 8 characters for your new password."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "mt-8",
					onSubmit: handleSubmit,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex items-center gap-3 border-b border-border pb-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								required: true,
								type: "email",
								value: email,
								onChange: (event) => setEmail(event.target.value),
								placeholder: "Email address",
								className: "w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockKeyhole, { className: "h-4 w-4 text-muted-foreground" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "mt-6 flex items-center gap-3 border-b border-border pb-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								required: true,
								minLength: 8,
								type: showPassword ? "text" : "password",
								value: password,
								onChange: (event) => setPassword(event.target.value),
								placeholder: "New password",
								className: "w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setShowPassword((visible) => !visible),
								"aria-label": showPassword ? "Hide password" : "Show password",
								className: "text-muted-foreground transition-colors hover:text-foreground",
								children: showPassword ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-4 w-4" })
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "mt-6 flex items-center gap-3 border-b border-border pb-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								required: true,
								minLength: 8,
								type: showPassword ? "text" : "password",
								value: passwordConfirmation,
								onChange: (event) => setPasswordConfirmation(event.target.value),
								placeholder: "Confirm new password",
								className: "w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
							})
						}),
						error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-5 text-sm font-medium text-destructive",
							children: error
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "submit",
							disabled: submitting || !token,
							className: "bg-navy mt-8 w-full rounded-full py-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-card)] disabled:cursor-not-allowed disabled:opacity-60",
							children: submitting ? "Resetting password..." : "Reset password"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-6 text-center text-sm text-muted-foreground",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/login",
						className: "font-bold text-foreground",
						children: "Back to Log In"
					})
				})
			]
		})]
	});
}
//#endregion
export { ResetPasswordPage as component };
