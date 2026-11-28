import type { NextConfig } from "next";

// Read at build/dev-server start. Restart after filling Cloudinary env vars.
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const cloudinaryImagePattern = cloudinaryCloudName
  ? [
      {
        protocol: "https" as const,
        hostname: "res.cloudinary.com",
        pathname: `/${cloudinaryCloudName}/image/upload/**`,
        // Stored URLs are path-based; block query strings from other assets.
        search: "",
      },
    ]
  : [];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    globalNotFound: true,
    serverActions: {
      // Verification evidence and campaign photos are validated up to
      // 8-10 MB; leave room for multipart overhead. MIME/size checks
      // still run server-side.
      bodySizeLimit: "12mb",
    },
  },
  images: {
    // Supabase Storage (avatars, portfolio media)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      ...cloudinaryImagePattern,
    ],
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
