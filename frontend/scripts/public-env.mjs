// Vite embeds VITE_* values in browser bundles. Only these public settings belong there.
export function assertPublicEnvironment(environment) {
  const allowed = new Set([
    "VITE_API_URL",
    "VITE_API_PROXY_TARGET",
    "VITE_APP_NAME",

    // Public metadata automatically supplied by Vercel.
    "VITE_VERCEL_ENV",
    "VITE_VERCEL_TARGET_ENV",
    "VITE_VERCEL_URL",
    "VITE_VERCEL_BRANCH_URL",
    "VITE_VERCEL_PROJECT_PRODUCTION_URL",
    "VITE_VERCEL_DEPLOYMENT_ID",
    "VITE_VERCEL_PROJECT_ID",
    "VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG",
    "VITE_VERCEL_GIT_PROVIDER",
    "VITE_VERCEL_GIT_REPO_SLUG",
    "VITE_VERCEL_GIT_REPO_OWNER",
    "VITE_VERCEL_GIT_REPO_ID",
    "VITE_VERCEL_GIT_COMMIT_REF",
    "VITE_VERCEL_GIT_COMMIT_SHA",
    "VITE_VERCEL_GIT_COMMIT_MESSAGE",
    "VITE_VERCEL_GIT_COMMIT_AUTHOR_LOGIN",
    "VITE_VERCEL_GIT_COMMIT_AUTHOR_NAME",
    "VITE_VERCEL_GIT_PREVIOUS_SHA",
    "VITE_VERCEL_GIT_PULL_REQUEST_ID",
  ]);
  const unexpected = Object.keys(environment).filter(
    (key) => key.startsWith("VITE_") && !allowed.has(key),
  );
  if (unexpected.length) {
    throw new Error(
      `Unapproved browser environment variables: ${unexpected.join(", ")}. Keep secrets on the backend.`,
    );
  }
}
