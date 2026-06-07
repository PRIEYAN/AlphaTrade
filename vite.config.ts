import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

// Standard TanStack Start + Vite config.
// Plugin order matters: tsconfig paths -> tailwind -> nitro -> tanstackStart -> react.
// nitro produces the deployable server bundle in .output/ (node-server preset).
export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    nitro(),
    tanstackStart(),
    viteReact(),
  ],
});
