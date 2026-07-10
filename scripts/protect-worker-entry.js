import esbuild from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { findSensitiveWords, protectPanelSource } from "../src/lib/panel-protection.js";

const bundlePath = "dist/deploy/bundle.js";
const outputPath = "dist/deploy/index.js";

await esbuild.build({
  entryPoints: ["src/index.js"],
  bundle: true,
  format: "esm",
  platform: "browser",
  external: ["cloudflare:sockets"],
  loader: { ".md": "text", ".txt": "text" },
  minify: true,
  legalComments: "none",
  outfile: bundlePath,
  logLevel: "silent",
});

const source = await readFile(bundlePath, "utf8");
const protectedSource = protectPanelSource(source);
const leakedWords = findSensitiveWords(protectedSource);

if (leakedWords.length > 0) {
  throw new Error(`Protected deploy output still contains: ${leakedWords.join(", ")}`);
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, protectedSource, "utf8");
console.log(`Protected deploy entry written to ${outputPath}`);
