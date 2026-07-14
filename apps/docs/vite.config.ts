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
  assetsInclude: ["**/*.wasm"],
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
  optimizeDeps: {
    exclude: [
      "@vercel/og",
      "@opencenter-cloud/kobalte-core",
      "@opencenter-cloud/cmdk-solid",
      "@opencenter-cloud/somoto",
      "@corvu-next/calendar",
      "@corvu-next/drawer",
      "@corvu-next/otp-field",
      "@corvu-next/resizable",
      "@tanstack/solid-table",
      "@tanstack/solid-form",
      "@tanstack/solid-store",
      "@solid-primitives/deep",
    ],
    esbuildOptions: {
      plugins: [
        {
          name: "solidjs-web-browser-resolve",
          setup(build) {
            // Force @solidjs/web to resolve to the browser (dev) entry
            // instead of the server entry during dep optimization
            build.onResolve({ filter: /^@solidjs\/web$/ }, (args) => {
              return {
                path: resolve(
                  import.meta.dirname,
                  "../../node_modules/@solidjs/web/dist/dev.js"
                ),
              }
            })
          },
        },
      ],
    },
  },
  ssr: {
    external: ["@vercel/og"],
    noExternal: [
      "@opencenter-cloud/kobalte-core",
      "@opencenter-cloud/cmdk-solid",
      "@opencenter-cloud/somoto",
      "@solid-primitives/deep",
      "@tanstack/solid-store",
      "@tanstack/solid-table",
      "@tanstack/solid-form",
      /^@corvu-next\//,
    ],
  },
  build: {
    rollupOptions: {
      external: ["@vercel/og", "@opencenter-cloud/unovis-solid", "@unovis/ts", "@opencenter-cloud/somoto"],
    },
  },
  resolve: {
    conditions: ["browser", "development"],
    alias: {
      // Local solid-mdx replacement (upstream is Solid 1 only)
      "solid-mdx": resolve(import.meta.dirname, "src/lib/solid-mdx.tsx"),
    },
  },
})
