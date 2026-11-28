// Hosting headers are added after Laravel responds, so remove them at the outer edge.
// Vercel Build Output API v3 supports response-header delete transforms.
const removeHeader = (key) => ({
  type: "response.headers",
  op: "delete",
  target: { key },
});

export function edgeResponseRules() {
  return [
    {
      src: "/(.*)",
      transforms: ["x-railway-edge", "x-hikari-trace"].map(removeHeader),
      continue: true,
    },
    {
      // Keep intentional backend CORS policies intact. Public frontend assets are same-origin.
      src: "/(?!api(?:/|$)|storage(?:/|$))(.*)",
      transforms: [
        "access-control-allow-origin",
        "access-control-allow-credentials",
        "access-control-expose-headers",
      ].map(removeHeader),
      continue: true,
    },
  ];
}
