import { defineConfig } from "vitest/config";

function textAssetPlugin() {
  return {
    name: "text-asset-loader",
    transform(_code, id) {
      if (!id.endsWith(".md") && !id.endsWith(".txt")) return null;
      return {
        code: `export default ${JSON.stringify(_code)};`,
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [textAssetPlugin()],
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.js"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
      exclude: ["src/panel/worker.js"],
    },
  },
});
