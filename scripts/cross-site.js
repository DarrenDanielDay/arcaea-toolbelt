// @ts-check
const esbuild = require("esbuild");
const isBuild = process.argv.includes("--build");
/** @type {esbuild.BuildOptions} */
const sharedOptions = {
  entryPoints: ["src/services/cross-site-script.ts"],
  bundle: true,
  format: "esm",
};
async function serve() {
  const ctx = await esbuild.context({
    ...sharedOptions,
    outdir: "dist/services",
    sourcemap: "both",
  });
  await ctx.serve({
    servedir: "dist",
    port: 1486,
  });
}

async function build() {
  await esbuild.build({
    ...sharedOptions,
    outdir: "arcaea-toolbelt/services",
    minify: true,
    treeShaking: true,
  });
}

if (isBuild) {
  build();
} else {
  serve();
}
