import type { NextConfig } from "next";

// Set BASE_PATH (e.g. "/mytree") in .env to serve the app under a sub-path of a shared domain.
// It is inlined at build time, so rebuild after changing it.
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  cacheComponents: true,
  partialPrefetching: true,
  // Stored URLs are "/uploads/<name>"; they are answered by the login-protected file route.
  async rewrites() {
    return { beforeFiles: [{ source: "/uploads/:name", destination: "/api/files/:name" }], afterFiles: [], fallback: [] };
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
