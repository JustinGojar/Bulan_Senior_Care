import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { m as ShieldX } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/unauthorized-nvoL0a5M.js
var import_jsx_runtime = require_jsx_runtime();
function UnauthorizedPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "bg-app flex min-h-screen items-center justify-center px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "surface-card w-full max-w-lg p-8 text-center sm:p-10",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldX, { className: "mx-auto h-14 w-14 text-destructive" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-5 text-3xl font-extrabold",
					children: "Not authorized"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm leading-6 text-muted-foreground",
					children: "You do not have permission to view this page. Please return to the dashboard or contact an administrator."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/dashboard",
					className: "bg-navy mt-7 inline-flex rounded-full px-5 py-3 text-sm font-bold text-primary-foreground",
					children: "Go to dashboard"
				})
			]
		})
	});
}
//#endregion
export { UnauthorizedPage as component };
