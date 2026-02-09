import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  external: ["tronweb", "ethers", "drizzle-orm", "@novapay/db", "@novapay/crypto", "@novapay/shared", "@neondatabase/serverless"],
});
