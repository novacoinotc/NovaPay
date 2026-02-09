/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@novapay/db", "@novapay/shared", "@novapay/crypto"],
  experimental: {
    serverComponentsExternalPackages: [
      "@neondatabase/serverless",
      "tronweb",
      "ethers",
      "bip39",
      "@scure/bip32",
      "@noble/hashes",
      "@noble/curves",
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize tronweb and its dependencies on the server
      config.externals = config.externals || [];
      config.externals.push({
        tronweb: 'commonjs tronweb',
        ethers: 'commonjs ethers',
        bip39: 'commonjs bip39',
        '@scure/bip32': 'commonjs @scure/bip32',
      });
    }
    return config;
  },
};

module.exports = nextConfig;
