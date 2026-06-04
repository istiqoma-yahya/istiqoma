import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "server",
          include: ["tests/server/**/*.test.ts"],
          environment: "node",
          globals: true,
        },
        resolve: {
          alias: {
            "@shared": resolve(__dirname, "shared"),
          },
        },
      },
      {
        test: {
          name: "client",
          include: ["tests/client/**/*.test.tsx", "tests/client/**/*.test.ts"],
          environment: "happy-dom",
          globals: true,
          setupFiles: ["tests/client/setup.ts"],
        },
        resolve: {
          alias: {
            "@": resolve(__dirname, "client/src"),
            "@shared": resolve(__dirname, "shared"),
          },
        },
      },
    ],
  },
});
