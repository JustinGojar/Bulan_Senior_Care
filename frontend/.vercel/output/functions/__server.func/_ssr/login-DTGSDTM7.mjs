import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { C as login } from "./router-D67W07gD.mjs";
import { O as Mail, R as Eye, z as EyeOff } from "../_libs/lucide-react.mjs";
import { n as ThemeToggle, t as BrandLogo } from "./ThemeToggle-Bhi21hDw.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-DTGSDTM7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function LoginPage() {
	const navigate = useNavigate();
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [rememberMe, setRememberMe] = (0, import_react.useState)(false);
	const [showPassword, setShowPassword] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [submitting, setSubmitting] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "bg-app relative grid min-h-screen place-items-center px-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeToggle, { className: "absolute top-5 right-5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "surface-card grid w-full max-w-4xl translate-y-4 overflow-hidden md:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-navy p-10 text-primary-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, { className: "h-11 w-11 ring-2 ring-gold/70" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-sm font-bold",
							children: "Bulan SeniorCare"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs opacity-70",
							children: "OSCA · Municipality of Bulan"
						})] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-12 text-4xl leading-tight font-extrabold",
						children: "Welcome, Lolo's and Lola's!"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display mt-4 text-xl text-gold",
						children: "Profile. Monitor. Serve better."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-5 max-w-sm text-sm leading-relaxed opacity-80",
						children: "One portal for senior citizen records, benefits, and services across every barangay in Bulan, Sorsogon."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-8 flex flex-wrap gap-3 text-xs font-semibold",
						children: [
							"Registration",
							"Eligibility",
							"Benefits"
						].map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-full bg-white/12 px-4 py-2",
							children: tag
						}, tag))
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "p-10",
				onSubmit: (e) => {
					e.preventDefault();
					setSubmitting(true);
					setError(null);
					login(email, password, rememberMe).then(() => navigate({ to: "/dashboard" })).catch((reason) => setError(reason.message)).finally(() => setSubmitting(false));
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-4xl font-extrabold",
						children: "Log In"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "mt-8 flex items-center gap-3 border-b border-border pb-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							required: true,
							type: "email",
							value: email,
							onChange: (e) => setEmail(e.target.value),
							placeholder: "Mobile Number or Email",
							className: "w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-4 w-4 text-muted-foreground" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "mt-7 flex items-center gap-3 border-b border-border pb-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: showPassword ? "text" : "password",
							value: password,
							onChange: (e) => setPassword(e.target.value),
							placeholder: "Password",
							className: "w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setShowPassword((visible) => !visible),
							"aria-label": showPassword ? "Hide password" : "Show password",
							className: "text-muted-foreground transition-colors hover:text-foreground",
							children: showPassword ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-4 w-4" })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 flex items-center justify-between text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: rememberMe,
								onChange: (event) => setRememberMe(event.target.checked),
								className: "h-4 w-4 accent-primary"
							}), "Remember Me"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/forgot-password",
							className: "font-bold",
							children: "Forgot Password?"
						})]
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-5 text-sm font-medium text-destructive",
						children: error
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						disabled: submitting,
						className: "bg-navy mt-8 w-full rounded-full py-4 text-sm font-bold text-primary-foreground shadow-[var(--shadow-card)]",
						children: submitting ? "Signing in..." : "Log In"
					})
				]
			})]
		})]
	});
}
//#endregion
export { LoginPage as component };
