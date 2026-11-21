import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "tesseract.js", "sharp"],
  outputFileTracingIncludes: {
    "/api/extract": ["./eng.traineddata", "./node_modules/tesseract.js-core/**/*"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
