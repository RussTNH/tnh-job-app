import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: [
        "Chrome >= 64",
        "Android >= 6",
        "Safari >= 11.1",
        "iOS >= 11",
      ],
      modernPolyfills: true,
      additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
    }),
  ],
  build: {
    target: "es2015",
    cssTarget: "chrome61",
  },
});