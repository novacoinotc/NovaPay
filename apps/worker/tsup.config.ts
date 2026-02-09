import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  // Bundle everything except native modules
  noExternal: [/@novapay\/.*/],
  external: ["tronweb", "ethers", "@neondatabase/serverless", "bip39", "@scure/bip32"],
});
