import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        parent: "index.html",
        callback: "callback.html",
        attacker: "attacker.html",
      },
    },
  },
});
