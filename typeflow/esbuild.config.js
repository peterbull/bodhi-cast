import * as esbuild from "esbuild";

const result = await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "dist/index.js",
  external: [
    "jsdom",
    "pg",
    "fastify",
    "@fastify/*",
    "eccodes-ts",
    "toad-scheduler",
    "drizzle-orm/*",
  ],
  minify: true,
  sourcemap: true,
  metafile: true,
});

if (result.metafile) {
  const text = await esbuild.analyzeMetafile(result.metafile);
  console.log("\nBundle analysis:", text);
}
