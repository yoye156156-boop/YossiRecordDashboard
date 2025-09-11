import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // אפשר להוסיף כאן גם כתובות רשת מקומיות נוספות
  allowedDevOrigins: ["127.0.0.1", "localhost", "10.0.0.15"],
};

export default nextConfig;
