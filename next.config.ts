import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  // Runtime reads of data/ (AD-15) are not found by file tracing, so the
  // routes that read the vocabulary list it, and Hjem lists the Example pair too.
  outputFileTracingIncludes: {
    "/api/**": ["./data/vocabulary/**"],
    "/": ["./data/vocabulary/**", "./data/fixtures/example-nordic-digital/**"],
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
