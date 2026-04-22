import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/student",
        destination: "/maariduna/student",
        permanent: false
      },
      {
        source: "/teacher",
        destination: "/maariduna/teacher",
        permanent: false
      },
      {
        source: "/submissions/:id",
        destination: "/maariduna/submissions/:id",
        permanent: false
      }
    ];
  }
};

export default nextConfig;
