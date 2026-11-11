export const ROLE_PREFIXES: Record<string, string> = {
  admin: "admin",
  head: "head",
  president: "bsca",
  encoder: "encoder",
  viewer: "viewer",
};

export const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/privacy-policy",
  "/terms-of-service",
  "/refund-policy",
  "/cookie-policy",
]);

export function hasSystemPermission(
  user: { role: string; granted_permissions?: string[] } | null | undefined,
  permission: string,
) {
  return user?.role === "admin" || Boolean(user?.granted_permissions?.includes(permission));
}
