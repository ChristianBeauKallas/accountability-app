/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // A stable per-deploy build id, baked into the client bundle at build time.
    // On Vercel this is the commit SHA; locally it's "dev". VersionWatch compares
    // it against /api/version at runtime to auto-refresh a stale installed PWA.
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA || "dev",
  },
};

export default nextConfig;
