import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/tron/index.ts",
    "src/ethereum/index.ts",
    "src/encryption/index.ts",
    "src/prices/index.ts",
    "src/hd-wallet/index.ts",
  ],
  format: ["esm"],
  dts: true,
  clean: true,
  splitting: false,
  external: ["tronweb", "ethers", "@novapay/shared"],
});
