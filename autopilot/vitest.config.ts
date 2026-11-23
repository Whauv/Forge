import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    // Default to jsdom so React component tests can render. Route-handler
    // tests opt back into node with a `// @vitest-environment node` header.
    environment: "jsdom",
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
