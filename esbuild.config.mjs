import esbuild from "esbuild";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import builtins from "builtin-modules";

const production = process.argv[2] === "production";
// Obsidian treats this ID as an installed-plugin identity, not a display name.
// Keep it stable across branding changes so existing vault enablement survives.
const developmentInstall = JSON.parse(await readFile("config/development-install.json", "utf8"));
const publicManifest = JSON.parse(await readFile("manifest.json", "utf8"));
const pluginDirectory = `scratch-vault/.obsidian/plugins/${developmentInstall.directoryId}`;
await mkdir(pluginDirectory, { recursive: true });
await Promise.all([
  writeFile(`${pluginDirectory}/manifest.json`, `${JSON.stringify({ ...publicManifest, ...developmentInstall.manifestOverrides }, null, 2)}\n`, "utf8"),
  copyFile("styles.css", `${pluginDirectory}/styles.css`)
]);
const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*", ...builtins],
  format: "cjs",
  target: "es2022",
  logLevel: "info",
  sourcemap: production ? false : "inline",
  minify: production,
  treeShaking: true,
  outfile: `${pluginDirectory}/main.js`
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
