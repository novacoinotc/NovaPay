/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@novapay/db", "@novapay/shared", "@novapay/crypto"],
  experimental: {
    serverComponentsExternalPackages: ["@neondatabase/serverless"],
  },
};

module.exports = nextConfig;
