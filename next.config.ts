import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  // Runtime reads of data/ (AD-15) are not found by file tracing, so the
  // routes that read the vocabulary list it, and Hjem and Søknad list the
  // Example pair too. The API routes list the Example pair with its cached/
  // folder: the cached adapter reads it in Test mode.
  outputFileTracingIncludes: {
    "/api/**": [
      "./data/vocabulary/**",
      "./data/fixtures/example-nordic-digital/**",
    ],
    "/": ["./data/vocabulary/**", "./data/fixtures/example-nordic-digital/**"],
    "/soknad": ["./data/fixtures/example-nordic-digital/**"],
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
