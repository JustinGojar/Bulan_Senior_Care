import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as logo_default } from "./router-D67W07gD.mjs";
import { d as Sun, w as Moon } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ThemeToggle-Bhi21hDw.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function BrandLogo({ className = "h-10 w-10" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src: logo_default,
		alt: "Bulan SeniorCare logo",
		className: `rounded-full object-cover ${className}`
	});
}
var THEME_KEY = "bulan-theme";
function getTheme() {
	if (typeof window === "undefined") return "light";
	return window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
}
function applyTheme(theme) {
	document.documentElement.classList.toggle("dark", theme === "dark");
	document.documentElement.style.colorScheme = theme;
	window.localStorage.setItem(THEME_KEY, theme);
}
function ThemeToggle({ className = "" }) {
	const [theme, setTheme] = (0, import_react.useState)("light");
	(0, import_react.useEffect)(() => {
		const storedTheme = getTheme();
		setTheme(storedTheme);
		applyTheme(storedTheme);
	}, []);
	const isDark = theme === "dark";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick: () => {
			const nextTheme = isDark ? "light" : "dark";
			setTheme(nextTheme);
			applyTheme(nextTheme);
		},
		"aria-label": isDark ? "Switch to light mode" : "Switch to dark mode",
		title: isDark ? "Switch to light mode" : "Switch to dark mode",
		className: `grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card text-foreground shadow-[var(--shadow-soft)] transition-colors hover:bg-secondary ${className}`,
		children: isDark ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { className: "h-5 w-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { className: "h-5 w-5" })
	});
}
//#endregion
export { ThemeToggle as n, BrandLogo as t };
