/** @type {import('next').NextConfig} */
const nextConfig = {
  // The Story image route (next/og) reads bundled Inter TTFs at runtime; make
  // sure they're traced into the serverless function.
  outputFileTracingIncludes: {
    "/api/story/[postId]": ["./assets/fonts/**"],
  },
};

export default nextConfig;
