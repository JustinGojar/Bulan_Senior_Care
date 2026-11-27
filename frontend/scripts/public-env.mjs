// Vite embeds VITE_* values in browser bundles. Only these public settings belong there.
export function assertPublicEnvironment(environment) {
  const allowed = new Set(["VITE_API_URL", "VITE_API_PROXY_TARGET", "VITE_APP_NAME"]);
  const unexpected = Object.keys(environment).filter(
    (key) => key.startsWith("VITE_") && !allowed.has(key),
  );
  if (unexpected.length) {
    throw new Error(
      `Unapproved browser environment variables: ${unexpected.join(", ")}. Keep secrets on the backend.`,
    );
  }
}
