import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { D as requestPasswordReset } from "./router-D67W07gD.mjs";
import { O as Mail } from "../_libs/lucide-react.mjs";
import { n as ThemeToggle, t as BrandLogo } from "./ThemeToggle-Bhi21hDw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/forgot-password-Baf7NoeK.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ForgotPasswordPage() {
	const [email, setEmail] = (0, import_react.useState)("");
	const [message, setMessage] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [submitting, setSubmitting] = (0, import_react.useState)(false);
	function handleSubmit(event) {
		event.preventDefault();
		setSubmitting(true);
		setError(null);
		setMessage(null);
		requestPasswordReset(email).then((result) => setMessage(result.message)).catch((reason) => setError(reason.message)).finally(() => setSubmitting(false));
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
					children: "Forgot password?"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm leading-relaxed text-muted-foreground",
					children: "Enter your account email and we'll send you a link to create a new password."
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
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-4 w-4 text-muted-foreground" })]
						}),
						message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-5 text-sm font-medium text-success",
							children: message
						}),
						error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-5 text-sm font-medium text-destructive",
							children: error
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "submit",
							disabled: submitting,
							className: "bg-navy mt-8 w-full rounded-full py-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-card)] disabled:cursor-not-allowed disabled:opacity-60",
							children: submitting ? "Sending link..." : "Send reset link"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-6 text-center text-sm text-muted-foreground",
					children: [
						"Remember your password?",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/login",
							className: "font-bold text-foreground",
							children: "Log In"
						})
					]
				})
			]
		})]
	});
}
//#endregion
export { ForgotPasswordPage as component };
