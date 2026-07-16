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
  /**
   * SSR configuration — controls which dependencies Vite bundles (noExternal)
   * vs. leaves as bare `import` for Node to resolve (external) during SSR.
   *
   * ## Why noExternal is needed (hydration key alignment)
   *
   * Solid's compiler generates deterministic hydration keys from the component
   * tree structure. If the server resolves a package's pre-compiled `.js` entry
   * (which has baked-in keys from a different compilation pass) while the client
   * resolves the `.jsx` source (compiled fresh by Vite), hydration keys diverge
   * and the app fails with mismatched markers. Marking packages as `noExternal`
   * forces Vite to compile them from source on both sides, producing identical keys.
   *
   * ## Which packages need it and why
   *
   * **Solid JSX packages** (`@opencenter-cloud/kobalte-core`, `cmdk-solid`,
   * `@corvu-next/*`): Ship a `"solid"` export condition pointing to `.jsx`
   * source. Without `noExternal`, Node's SSR import resolves to their compiled
   * `"node"` or `"default"` entry instead, breaking hydration.
   *
   * **@opencenter-cloud/somoto**: Uses `browser`/`node` conditional exports (no
   * `"solid"` condition). Needs noExternal so Vite applies consistent resolution
   * on both sides via the `resolve.conditions: ["browser"]` config above.
   *
   * **TanStack packages** (`solid-table`, `solid-form`, `solid-store`): Ship a
   * `"solid"` condition pointing to uncompiled source that uses Solid 1 API names
   * (`createComputed`, `mergeProps`, `splitProps`, `onMount`, `solid-js/store`).
   * The `solid-compat` plugin intercepts these imports and shims them to Solid 2
   * equivalents. Without `noExternal`, the shim wouldn't apply during SSR.
   *
   * **@solid-primitives/deep**: Pre-built for Solid 2 but uses a custom
   * `@solid-primitives/source` condition instead of standard `"solid"`. Needs
   * noExternal + the compat shim for `solid-js/store` path rewriting.
   *
   * ## Note on kobalte-core's "node" condition
   *
   * `@opencenter-cloud/kobalte-core` exports a `"node"` condition pointing to
   * `./dist/server/index.js` — a pre-compiled server bundle for non-Vite SSR
   * consumers (e.g., plain Node scripts). In this Vite setup it is intentionally
   * bypassed: `noExternal` ensures Vite compiles from the `"solid"` `.jsx` entry
   * on both client and server, maintaining hydration key parity.
   *
   * @see apps/docs/src/ssr-hydration-audit.test.ts — regression test
   * @see apps/docs/plugins/solid-compat.ts — Solid 1→2 API shim
   */
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
      external: ["@vercel/og"],
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
