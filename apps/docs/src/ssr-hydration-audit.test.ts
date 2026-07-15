/**
 * SSR/Hydration Regression Test
 *
 * Validates that all packages listed in vite.config.ts `ssr.noExternal` meet
 * the requirements for correct SSR hydration:
 *
 * 1. Solid JSX packages expose a `"solid"` export condition pointing to `.jsx`
 *    source so Vite can compile them with the Solid transformer (ensuring
 *    matching hydration keys between server and client).
 *
 * 2. Packages rebuilt for Solid 2 (`@opencenter-cloud/*`, `@corvu-next/*`) must
 *    NOT contain `solid-js/web` imports (the Solid 1 path) in their dist.
 *
 * 3. TanStack packages that still ship Solid 1 API names (`createComputed`,
 *    `mergeProps`, `splitProps`, `onMount`, `solid-js/store`) are covered by
 *    the solid-compat Vite plugin.
 */
import { describe, expect, it } from "vitest"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { resolve, join } from "node:path"

const ROOT = resolve(import.meta.dirname, "../../..")

function resolvePackage(pkg: string): string | null {
  // pnpm hoists some packages to root node_modules directly
  const direct = resolve(ROOT, "node_modules", pkg)
  if (existsSync(resolve(direct, "package.json"))) return direct

  // pnpm stores others only in .pnpm — search for the first match
  // targeting the solid-js@2.0.0-beta.15 peer (our active version)
  const pnpmDir = resolve(ROOT, "node_modules/.pnpm")
  if (!existsSync(pnpmDir)) return null

  const prefix = pkg.replace("/", "+").replace("@", "@")
  let entries = readdirSync(pnpmDir).filter(
    (e) => e.startsWith(prefix) && e.includes("solid-js@2.0.0-beta.15")
  )

  // Prefer "next" or higher versions over older stable releases
  // (e.g. 1.0.0-next.1 over 0.2.10). Check that "next" appears in the
  // package version segment, not just the peer dependency suffix.
  if (entries.length > 1) {
    // The pnpm directory format is: @scope+name@version_peer-info
    // Extract entries where the version segment itself contains "next"
    const nextEntries = entries.filter((e) => {
      // Match the version part: after the package prefix + "@"
      const afterPrefix = e.slice(prefix.length + 1) // skip "@" after name
      const versionPart = afterPrefix.split("_")[0] // version before peer suffix
      return versionPart.includes("next")
    })
    if (nextEntries.length > 0) entries = nextEntries
  }

  if (entries.length === 0) {
    // Fallback: any version of the package
    const fallback = readdirSync(pnpmDir).filter((e) =>
      e.startsWith(prefix)
    )
    if (fallback.length > 0) {
      const candidate = resolve(pnpmDir, fallback[0], "node_modules", pkg)
      if (existsSync(resolve(candidate, "package.json"))) return candidate
    }
    return null
  }

  const candidate = resolve(pnpmDir, entries[0], "node_modules", pkg)
  if (existsSync(resolve(candidate, "package.json"))) return candidate
  return null
}

function readPkgJson(pkgDir: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(pkgDir, "package.json"), "utf-8"))
}

/**
 * Recursively collects all `.js` and `.jsx` files under a directory.
 */
function collectJsFiles(dir: string): string[] {
  const results: string[] = []
  if (!existsSync(dir)) return results
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectJsFiles(full))
    } else if (/\.(jsx?|tsx?|mjs)$/.test(entry.name)) {
      results.push(full)
    }
  }
  return results
}

// ─── Package Categories ─────────────────────────────────────────────────────

/** Packages rebuilt from source for Solid 2 — must have `solid` export and no `solid-js/web` */
const SOLID2_NATIVE_PACKAGES = [
  "@opencenter-cloud/kobalte-core",
  "@opencenter-cloud/cmdk-solid",
  "@corvu-next/drawer",
  "@corvu-next/calendar",
  "@corvu-next/otp-field",
  "@corvu-next/resizable",
] as const

/** TanStack packages with `solid` export condition — source uses Solid 1 API names, shimmed at build */
const TANSTACK_SHIMMED_WITH_SOLID_CONDITION = [
  "@tanstack/solid-table",
  "@tanstack/solid-form",
] as const

/**
 * TanStack packages WITHOUT a `solid` condition — compiled dist uses Solid 1
 * import paths (`solid-js/web`, `createContext` from `solid-js`) that the compat
 * shim rewrites. Needs noExternal so the shim applies during SSR.
 */
const TANSTACK_SHIMMED_NO_SOLID_CONDITION = [
  "@tanstack/solid-store", // v0.11.0: dropped solid condition, dist uses solid-js/web
] as const

/** Packages with non-standard export conditions but still need noExternal */
const SPECIAL_PACKAGES = [
  "@opencenter-cloud/somoto", // uses browser/node/worker conditions, no solid condition
  "@solid-primitives/deep", // uses @solid-primitives/source condition
] as const

/** Solid 1 import paths that should NOT appear in Solid 2 rebuilt packages */
const SOLID1_IMPORT_PATTERN = /from\s+['"]solid-js\/web['"]/

/** Solid 1 API names that the compat shim replaces */
const SOLID1_API_NAMES = [
  "createComputed",
  "mergeProps",
  "splitProps",
  "onMount",
] as const

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("SSR noExternal: Solid 2 native packages", () => {
  for (const pkg of SOLID2_NATIVE_PACKAGES) {
    describe(pkg, () => {
      const pkgDir = resolvePackage(pkg)

      it("is installed", () => {
        expect(pkgDir).not.toBeNull()
      })

      it('has a "solid" export condition pointing to .jsx', () => {
        if (!pkgDir) return
        const pkgJson = readPkgJson(pkgDir)
        const exports = pkgJson.exports as Record<string, unknown> | undefined

        // Could be at exports["."].solid or exports.solid
        const rootExport = (exports?.["."] ?? exports) as Record<
          string,
          unknown
        >
        const solidEntry = rootExport.solid as string | undefined

        expect(solidEntry).toBeDefined()
        expect(solidEntry).toMatch(/\.jsx$/)
      })

      it("does NOT import from solid-js/web (Solid 1 path) in dist", () => {
        if (!pkgDir) return
        const distDir = resolve(pkgDir, "dist")
        const files = collectJsFiles(distDir)

        const violations: string[] = []
        for (const file of files) {
          const content = readFileSync(file, "utf-8")
          if (SOLID1_IMPORT_PATTERN.test(content)) {
            violations.push(file.replace(pkgDir + "/", ""))
          }
        }

        expect(
          violations,
          `Found solid-js/web imports in:\n${violations.join("\n")}`
        ).toHaveLength(0)
      })
    })
  }
})

describe("SSR noExternal: TanStack shimmed packages (with solid condition)", () => {
  /** The packages that solid-compat.ts lists as shimmed */
  const SHIMMED_IN_PLUGIN = [
    "@tanstack/solid-table",
    "@tanstack/solid-form",
    "@tanstack/solid-store",
    "@solid-primitives/deep",
  ]

  for (const pkg of TANSTACK_SHIMMED_WITH_SOLID_CONDITION) {
    describe(pkg, () => {
      const pkgDir = resolvePackage(pkg)

      it("is installed", () => {
        expect(pkgDir).not.toBeNull()
      })

      it('has a "solid" export condition', () => {
        if (!pkgDir) return
        const pkgJson = readPkgJson(pkgDir)
        const exports = pkgJson.exports as Record<string, unknown> | undefined
        const rootExport = (exports?.["."] ?? exports) as Record<
          string,
          unknown
        >
        const solidEntry = rootExport.solid

        expect(solidEntry).toBeDefined()
      })

      it("uses Solid 1 API names in source (confirming shim is needed)", () => {
        if (!pkgDir) return
        const pkgJson = readPkgJson(pkgDir)
        const exports = pkgJson.exports as Record<string, unknown> | undefined
        const rootExport = (exports?.["."] ?? exports) as Record<
          string,
          unknown
        >
        const solidEntry = rootExport.solid as
          | string
          | { default?: string }
          | undefined
        const entryPath =
          typeof solidEntry === "string"
            ? solidEntry
            : solidEntry?.default ?? ""

        if (!entryPath) return

        // Scan all .jsx/.tsx files in the solid entry's directory (source files
        // are re-exported transitively from the entry point)
        const entryDir = resolve(pkgDir, entryPath, "..")
        const sourceFiles = collectJsFiles(entryDir)

        // Combine all source content
        const allContent = sourceFiles
          .map((f) => readFileSync(f, "utf-8"))
          .join("\n")

        // At least one Solid 1 API name must be present (justifying the shim)
        const usedApis = SOLID1_API_NAMES.filter((api) =>
          new RegExp(`\\b${api}\\b`).test(allContent)
        )

        expect(
          usedApis.length,
          `${pkg} source should use at least one Solid 1 API name that needs shimming`
        ).toBeGreaterThan(0)
      })

      it("is covered by solid-compat plugin", () => {
        expect(SHIMMED_IN_PLUGIN).toContain(pkg)
      })
    })
  }
})

describe("SSR noExternal: TanStack shimmed packages (no solid condition)", () => {
  for (const pkg of TANSTACK_SHIMMED_NO_SOLID_CONDITION) {
    describe(pkg, () => {
      const pkgDir = resolvePackage(pkg)

      it("is installed", () => {
        expect(pkgDir).not.toBeNull()
      })

      it("does NOT have a solid export condition (dist-only package)", () => {
        if (!pkgDir) return
        const pkgJson = readPkgJson(pkgDir)
        const exports = pkgJson.exports as Record<string, unknown> | undefined
        const rootExport = (exports?.["."] ?? exports) as Record<
          string,
          unknown
        >
        // v0.11.0 dropped the solid condition — only has import/require
        expect(rootExport.solid).toBeUndefined()
      })

      it("uses solid-js/web in compiled dist (confirming shim is needed)", () => {
        if (!pkgDir) return
        const distDir = resolve(pkgDir, "dist")
        const files = collectJsFiles(distDir)

        const usesSolid1Web = files.some((f) =>
          SOLID1_IMPORT_PATTERN.test(readFileSync(f, "utf-8"))
        )

        expect(
          usesSolid1Web,
          `${pkg} dist should use solid-js/web (Solid 1 path), confirming the compat shim is needed`
        ).toBe(true)
      })

      it("is covered by solid-compat plugin", () => {
        const SHIMMED_IN_PLUGIN = [
          "@tanstack/solid-table",
          "@tanstack/solid-form",
          "@tanstack/solid-store",
          "@solid-primitives/deep",
        ]
        expect(SHIMMED_IN_PLUGIN).toContain(pkg)
      })
    })
  }
})

describe("SSR noExternal: special packages", () => {
  describe("@opencenter-cloud/somoto", () => {
    const pkgDir = resolvePackage("@opencenter-cloud/somoto")

    it("is installed", () => {
      expect(pkgDir).not.toBeNull()
    })

    it("uses browser/node conditional exports (no solid condition)", () => {
      if (!pkgDir) return
      const pkgJson = readPkgJson(pkgDir)
      const exports = pkgJson.exports as Record<string, unknown> | undefined
      const rootExport = (exports?.["."] ?? exports) as Record<
        string,
        unknown
      >

      // somoto uses browser/node/worker conditions instead of solid
      expect(rootExport.browser).toBeDefined()
      expect(rootExport.node).toBeDefined()
    })

    it("does NOT import from solid-js/web in dist", () => {
      if (!pkgDir) return
      const distDir = resolve(pkgDir, "dist")
      const files = collectJsFiles(distDir)

      const violations: string[] = []
      for (const file of files) {
        const content = readFileSync(file, "utf-8")
        if (SOLID1_IMPORT_PATTERN.test(content)) {
          violations.push(file.replace(pkgDir + "/", ""))
        }
      }

      expect(violations).toHaveLength(0)
    })
  })

  describe("@solid-primitives/deep", () => {
    const pkgDir = resolvePackage("@solid-primitives/deep")

    it("is installed", () => {
      expect(pkgDir).not.toBeNull()
    })

    it("uses @solidjs/web (Solid 2 path), not solid-js/web", () => {
      if (!pkgDir) return
      const distDir = resolve(pkgDir, "dist")
      const files = collectJsFiles(distDir)

      const solid1Violations: string[] = []
      let usesSolid2Web = false

      for (const file of files) {
        const content = readFileSync(file, "utf-8")
        if (SOLID1_IMPORT_PATTERN.test(content)) {
          solid1Violations.push(file.replace(pkgDir + "/", ""))
        }
        if (/from\s+['"]@solidjs\/web['"]/.test(content)) {
          usesSolid2Web = true
        }
      }

      expect(solid1Violations).toHaveLength(0)
      expect(usesSolid2Web).toBe(true)
    })

    it("is covered by solid-compat plugin (for solid-js/store shim)", () => {
      // solid-compat shims solid-js/store → solid-js for this package
      const SHIMMED_IN_PLUGIN = [
        "@tanstack/solid-table",
        "@tanstack/solid-form",
        "@tanstack/solid-store",
        "@solid-primitives/deep",
      ]
      expect(SHIMMED_IN_PLUGIN).toContain("@solid-primitives/deep")
    })
  })
})

describe("SSR noExternal: vite.config.ts alignment", () => {
  it("all audited packages are present in ssr.noExternal", () => {
    // Read the vite config to verify noExternal list matches our audit
    const configPath = resolve(
      ROOT,
      "apps/docs/vite.config.ts"
    )
    const config = readFileSync(configPath, "utf-8")

    const allPackages = [
      ...SOLID2_NATIVE_PACKAGES,
      ...TANSTACK_SHIMMED_WITH_SOLID_CONDITION,
      ...TANSTACK_SHIMMED_NO_SOLID_CONDITION,
      ...SPECIAL_PACKAGES,
    ]

    for (const pkg of allPackages) {
      // @corvu-next packages are covered by the regex /^@corvu-next\//
      if (pkg.startsWith("@corvu-next/")) {
        expect(
          config,
          `vite.config.ts should contain regex for @corvu-next scope`
        ).toContain("@corvu-next")
        continue
      }
      expect(
        config,
        `${pkg} should be in ssr.noExternal`
      ).toContain(pkg)
    }
  })

  it("solid-compat plugin SHIMMED_PACKAGES matches TanStack + deep", () => {
    const pluginPath = resolve(
      ROOT,
      "apps/docs/plugins/solid-compat.ts"
    )
    const pluginSource = readFileSync(pluginPath, "utf-8")

    const expectedShimmed = [
      "@tanstack/solid-table",
      "@tanstack/solid-form",
      "@tanstack/solid-store",
      "@solid-primitives/deep",
    ]

    for (const pkg of expectedShimmed) {
      expect(
        pluginSource,
        `solid-compat.ts should shim ${pkg}`
      ).toContain(pkg)
    }
  })
})
