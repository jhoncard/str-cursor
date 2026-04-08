import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Load Supabase from node_modules on the server instead of webpack vendor
  // chunks. Avoids intermittent dev 500s: "Cannot find module
  // './vendor-chunks/@supabase+auth-js@…'" when .next is stale or pnpm layout
  // shifts chunk names (Header → getUser → @supabase/ssr → auth-js).
  serverExternalPackages: [
    "@supabase/ssr",
    "@supabase/supabase-js",
    "@supabase/auth-js",
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'a0.muscache.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  // Admin property image upload uses a Server Action + FormData (default limit is 1 MB).
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
