import { resolve } from "node:path"
import { tanstackStart } from "@tanstack/solid-start/plugin/vite"
import unoCSS from "unocss/vite"
import { defineConfig } from "vite"
import viteSolid from "vite-plugin-solid"
import tsConfigPaths from "vite-tsconfig-paths"
import solidCompat from "../docs/plugins/solid-compat"

export default defineConfig({
  server: {
    port: 3002,
  },
  plugins: [
    solidCompat(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    unoCSS(),
    tanstackStart({
      prerender: { crawlLinks: true },
    }),
    viteSolid({ ssr: true }),
  ],
  resolve: {
    alias: {
      "solid-js/web": "@solidjs/web",
      "solid-js/store": "solid-js",
    },
    noExternal: [
      "@opencenter-cloud/kobalte-core",
      "@opencenter-cloud/cmdk-solid",
    ],
  },
})
