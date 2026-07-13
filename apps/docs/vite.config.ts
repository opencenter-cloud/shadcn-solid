import { resolve } from "node:path"
import { tanstackStart } from "@tanstack/solid-start/plugin/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import viteSolid from "vite-plugin-solid"
import tsConfigPaths from "vite-tsconfig-paths"

import content from "./plugins/content"
import mdx from "./plugins/mdx"
import solidCompat from "./plugins/solid-compat"

export default defineConfig({
  server: {
    port: 3001,
  },
  plugins: [
    solidCompat(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    mdx(),
    content(),
    tanstackStart({
      prerender: {
        crawlLinks: true,
      },
    }),
    viteSolid({
      ssr: true,
      extensions: [".mdx"],
    }),
  ],
  build: {
    rollupOptions: {
      external: ["@vercel/og", "@opencenter-cloud/unovis-solid", "@unovis/ts", "@opencenter-cloud/somoto"],
    },
  },
  resolve: {
    alias: {
      // Local solid-mdx replacement (upstream is Solid 1 only)
      "solid-mdx": resolve(import.meta.dirname, "src/lib/solid-mdx.tsx"),
    },
    noExternal: [
      "@opencenter-cloud/kobalte-core",
      "@opencenter-cloud/cmdk-solid",
      "@opencenter-cloud/somoto",
      "@solid-primitives/deep",
      "@tanstack/solid-store",
      "@tanstack/solid-table",
      /^@corvu-next\//,
    ],
  },
})
