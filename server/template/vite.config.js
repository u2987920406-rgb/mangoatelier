import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // The builder UI embeds this app in an iframe from another origin (localhost:5173)
    cors: true,
  },
});
