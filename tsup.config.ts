import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["src/index.ts"],
  format: ["cjs"],
  sourcemap: true,
  minify: true,
  target: "esnext",
  outDir: "dist",
  bundle: true,
  splitting: false,
  skipNodeModulesBundle: false,
});
