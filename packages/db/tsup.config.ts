import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/schema.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  splitting: false,
  external: ["@neondatabase/serverless"],
});
