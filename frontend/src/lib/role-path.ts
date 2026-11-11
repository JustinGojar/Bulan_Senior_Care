import type { LocationRewrite } from "@tanstack/react-router";
import { getStoredUser } from "@/lib/api";
import { PUBLIC_PATHS, ROLE_PREFIXES } from "./route-access.ts";
export { PUBLIC_PATHS } from "./route-access.ts";

// The address bar shows account pages under the signed-in role, e.g. /admin/dashboard,
// /head/seniors or /bsca/benefits. Routes stay unprefixed inside the app: the router strips
// the prefix from the URL it reads and adds it back to every URL it writes.
const KNOWN_PREFIXES = new Set(Object.values(ROLE_PREFIXES));

export function rolePrefixFor(role: string | null | undefined) {
  return role ? ROLE_PREFIXES[role.toLowerCase()] : undefined;
}

/** Splits "/admin/dashboard" into the role prefix "admin" and the app path "/dashboard". */
function splitRolePrefix(pathname: string) {
  const match = pathname.match(/^\/([^/]+)(\/.*)?$/);
  const prefix = match?.[1]?.toLowerCase();
  if (!prefix || !KNOWN_PREFIXES.has(prefix)) return { prefix: undefined, path: pathname };
  return { prefix, path: match?.[2] ?? "/" };
}

/** The role prefix a browser URL path starts with, if any. */
export function rolePrefixOf(publicPath: string) {
  return splitRolePrefix(new URL(publicPath, "http://localhost").pathname).prefix;
}

function addressBarRolePrefix() {
  if (typeof window === "undefined") return undefined;
  return splitRolePrefix(window.location.pathname).prefix;
}

export const rolePathRewrite: LocationRewrite = {
  input: ({ url }) => {
    url.pathname = splitRolePrefix(url.pathname).path;
    return url;
  },
  output: ({ url }) => {
    if (PUBLIC_PATHS.has(url.pathname)) return url;
    // Before the account loads (a page reload), keep the prefix already in the address bar.
    const prefix = rolePrefixFor(getStoredUser()?.role) ?? addressBarRolePrefix();
    if (prefix) url.pathname = `/${prefix}${url.pathname === "/" ? "" : url.pathname}`;
    return url;
  },
};
