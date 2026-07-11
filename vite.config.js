import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative asset paths: the built dist/ works at the domain root or any
  // subdirectory of mgfrankbooks.com without a rebuild.
  base: "./",
});
