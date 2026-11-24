export function securityHeaders(
  html?: string,
): Record<string, string> & { "Content-Security-Policy": string };
