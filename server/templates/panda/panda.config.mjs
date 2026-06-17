import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  preflight: true,
  include: ["./src/**/*.{js,jsx}"],
  exclude: [],
  theme: {
    extend: {
      tokens: {
        colors: {
          brand: {
            50:  { value: '#eef2ff' },
            200: { value: '#c7d2fe' },
            400: { value: '#818cf8' },
            500: { value: '#6366f1' },
            600: { value: '#4f46e5' },
            900: { value: '#1e1b4b' },
          },
        },
        radii: {
          card: { value: '12px' },
        },
      },
    },
  },
  outdir: "styled-system",
});
