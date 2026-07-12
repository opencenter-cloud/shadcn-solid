/**
 * AST Codemod: Migrate shadcn-solid registry components to Solid 2 APIs.
 *
 * Transformations:
 * 1. Import rewrites:
 *    - `@kobalte/core/*` → `@opencenter-cloud/kobalte-core/*`
 *    - `@corvu/drawer` → `@corvu-next/drawer` (etc.)
 *    - `cmdk-solid` → `@opencenter-cloud/cmdk-solid`
 *    - `solid-js/store` → `solid-js`
 *    - `ComponentProps`, `ValidComponent` from `solid-js` → from `@solidjs/web`
 *    - `splitProps` from `solid-js` → `omit` from `solid-js`
 *    - `mergeProps` from `solid-js` → `merge` from `solid-js`
 *    - `onMount` from `solid-js` → `onSettled` from `solid-js`
 * 2. splitProps: `const [, rest] = splitProps(x, [...])` → `const rest = omit(x, ...)`
 * 3. mergeProps: `mergeProps(...)` → `merge(...)`; rename local `const merge = mergeProps(...)` → `const mergedProps = merge(...)`
 * 4. Context.Provider: `<Ctx.Provider value={...}>` → `<Ctx value={...}>`
 * 5. createContext(): add `null` default where missing
 * 6. onMount → onSettled
 * 7. createEffect single-arg → split-phase
 * 8. solid-js/store → solid-js
 *
 * Usage: npx tsx scripts/codemod-solid2.ts
 */

import { Project, SyntaxKind, type SourceFile } from "ts-morph"
import * as path from "path"

const ROOT = path.resolve(import.meta.dirname, "..")
const REGISTRY_DIR = path.join(ROOT, "apps/docs/src/registry")

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getImportDeclarations(file: SourceFile) {
  return file.getImportDeclarations()
}

// ─── Transform: Rewrite import module specifiers ─────────────────────────────

function rewriteModuleSpecifiers(file: SourceFile) {
  for (const decl of getImportDeclarations(file)) {
    const specifier = decl.getModuleSpecifierValue()

    // @kobalte/core/* → @opencenter-cloud/kobalte-core/*
    if (specifier.startsWith("@kobalte/core")) {
      decl.setModuleSpecifier(
        specifier.replace("@kobalte/core", "@opencenter-cloud/kobalte-core")
      )
    }

    // @corvu/drawer → @corvu-next/drawer, etc.
    if (specifier.startsWith("@corvu/")) {
      decl.setModuleSpecifier(specifier.replace("@corvu/", "@corvu-next/"))
    }

    // cmdk-solid → @opencenter-cloud/cmdk-solid
    if (specifier === "cmdk-solid") {
      decl.setModuleSpecifier("@opencenter-cloud/cmdk-solid")
    }

    // solid-js/store → solid-js
    if (specifier === "solid-js/store") {
      decl.setModuleSpecifier("solid-js")
    }
  }
}

// ─── Transform: Move ComponentProps/ValidComponent to @solidjs/web ───────────

function moveTypesToSolidJsWeb(file: SourceFile) {
  const typesToMove = ["ComponentProps", "ValidComponent"]
  const solidJsImports = file
    .getImportDeclarations()
    .filter((d) => d.getModuleSpecifierValue() === "solid-js")

  const movedTypes: string[] = []

  for (const decl of solidJsImports) {
    const namedImports = decl.getNamedImports()
    for (const named of namedImports) {
      if (typesToMove.includes(named.getName())) {
        movedTypes.push(named.getName())
        named.remove()
      }
    }
    // If the declaration is now empty (no named imports, no default), remove it
    if (
      decl.getNamedImports().length === 0 &&
      !decl.getDefaultImport() &&
      !decl.getNamespaceImport()
    ) {
      decl.remove()
    }
  }

  // Also check type-only imports from solid-js
  const solidJsTypeImports = file
    .getImportDeclarations()
    .filter(
      (d) =>
        d.getModuleSpecifierValue() === "solid-js" && d.isTypeOnly()
    )

  for (const decl of solidJsTypeImports) {
    const namedImports = decl.getNamedImports()
    for (const named of namedImports) {
      if (typesToMove.includes(named.getName())) {
        if (!movedTypes.includes(named.getName())) {
          movedTypes.push(named.getName())
        }
        named.remove()
      }
    }
    if (
      decl.getNamedImports().length === 0 &&
      !decl.getDefaultImport() &&
      !decl.getNamespaceImport()
    ) {
      decl.remove()
    }
  }

  if (movedTypes.length === 0) return

  // Add or extend @solidjs/web import
  const existingWebImport = file
    .getImportDeclarations()
    .find((d) => d.getModuleSpecifierValue() === "@solidjs/web")

  if (existingWebImport) {
    // Add to existing import, ensuring type-only on each specifier
    for (const t of movedTypes) {
      if (!existingWebImport.getNamedImports().some((n) => n.getName() === t)) {
        existingWebImport.addNamedImport({ name: t, isTypeOnly: !existingWebImport.isTypeOnly() })
      }
    }
  } else {
    // Create new type-only import
    file.addImportDeclaration({
      moduleSpecifier: "@solidjs/web",
      isTypeOnly: true,
      namedImports: movedTypes.map((name) => ({ name })),
    })
  }
}

// ─── Transform: Rename splitProps → omit in imports ──────────────────────────

function renameSplitPropsImport(file: SourceFile) {
  for (const decl of getImportDeclarations(file)) {
    if (decl.getModuleSpecifierValue() !== "solid-js") continue
    const namedImports = decl.getNamedImports()
    for (const named of namedImports) {
      if (named.getName() === "splitProps") {
        named.setName("omit")
      }
    }
  }
}

// ─── Transform: Rename mergeProps → merge in imports ─────────────────────────

function renameMergePropsImport(file: SourceFile) {
  for (const decl of getImportDeclarations(file)) {
    if (decl.getModuleSpecifierValue() !== "solid-js") continue
    const namedImports = decl.getNamedImports()
    for (const named of namedImports) {
      if (named.getName() === "mergeProps") {
        named.setName("merge")
      }
    }
  }
}

// ─── Transform: Rename onMount → onSettled in imports ────────────────────────

function renameOnMountImport(file: SourceFile) {
  for (const decl of getImportDeclarations(file)) {
    if (decl.getModuleSpecifierValue() !== "solid-js") continue
    const namedImports = decl.getNamedImports()
    for (const named of namedImports) {
      if (named.getName() === "onMount") {
        named.setName("onSettled")
      }
    }
  }
}

// ─── Transform: Rewrite splitProps call sites ────────────────────────────────
// `const [, rest] = splitProps(source, ["a", "b"])` →
// `const rest = omit(source, "a", "b")`

function rewriteSplitPropsCalls(file: SourceFile) {
  const text = file.getFullText()

  // Pattern: const [, rest] = splitProps(source, ["key1", "key2", ...])
  // We'll use regex on the text since ts-morph doesn't easily handle destructuring pattern matching
  const pattern =
    /const \[,\s*(\w+)\]\s*=\s*splitProps\(([^,]+),\s*\[([\s\S]*?)\]\)/g

  let newText = text
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    const [fullMatch, restName, source, keysStr] = match
    // Parse keys from the array literal
    const keys = keysStr
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
      // Keys are already quoted strings like "class", "variant"
      .map((k) => k.replace(/['"]/g, "").trim())

    const omitArgs = keys.map((k) => `"${k}"`).join(", ")
    const replacement = `const ${restName} = omit(${source.trim()}, ${omitArgs})`
    newText = newText.replace(fullMatch, replacement)
  }

  if (newText !== text) {
    file.replaceWithText(newText)
  }
}

// ─── Transform: Rewrite mergeProps call sites ────────────────────────────────
// `mergeProps(...)` → `merge(...)`
// Handle conflict: `const merge = mergeProps(...)` → `const mergedProps = merge(...)`

function rewriteMergePropsCalls(file: SourceFile) {
  let text = file.getFullText()

  // First, handle the specific pattern: `const merge = mergeProps(` → `const mergedProps = merge(`
  // This avoids the local variable name conflicting with the imported `merge` function
  if (text.includes("const merge = mergeProps")) {
    text = text.replace(/const merge = mergeProps/g, "const mergedProps = merge")
    // Also rename all usages of the local `merge` variable to `mergedProps`
    // But we need to be careful not to rename the imported `merge` function itself.
    // The pattern in these files is:
    //   const merge = mergeProps({...}, props)
    //   const [, rest] = splitProps(merge, [...])
    //   ... merge.class ... merge.children ... merge.whatever
    // After our rename, it becomes:
    //   const mergedProps = merge({...}, props)
    //   const rest = omit(mergedProps, ...)
    //   ... mergedProps.class ... mergedProps.children ...

    // Replace `splitProps(merge,` → `omit(mergedProps,` (already handled by splitProps rewrite if order is right)
    // Replace property accesses on the old `merge` variable
    // Strategy: replace `merge.` with `mergedProps.` but NOT when it's the function call `merge(`
    // Actually safer: replace the specific patterns we know exist
    text = text.replace(/splitProps\(merge,/g, "splitProps(mergedProps,")
    // And any direct property access like `merge.class`, `merge.children`, `merge.options`, etc.
    // Use word boundary to avoid matching `mergedProps`
    text = text.replace(/(?<![.\w])merge\.(\w)/g, "mergedProps.$1")
    // Handle `merge,` in function arguments (e.g., passed as argument)
    // Don't replace `merge(` which is the function call
  } else if (text.includes("const merge = merge(")) {
    // Edge case: if the splitProps rewrite already ran but mergeProps rename didn't
    // This shouldn't happen in our flow but handle gracefully
  }

  // For files that DON'T have the `const merge = mergeProps(...)` pattern,
  // just do a straight rename of all `mergeProps(` → `merge(`
  if (!text.includes("mergedProps")) {
    text = text.replace(/\bmergeProps\(/g, "merge(")
    // Also handle type annotations: `mergeProps<Type[]>(` → `merge<Type[]>(`
    text = text.replace(/\bmergeProps</g, "merge<")
  } else {
    // The rename already happened above. But there might be other mergeProps calls
    // that aren't assigned to `const merge`
    text = text.replace(/\bmergeProps\(/g, "merge(")
    text = text.replace(/\bmergeProps</g, "merge<")
  }

  if (text !== file.getFullText()) {
    file.replaceWithText(text)
  }
}

// ─── Transform: Context.Provider → Context direct ────────────────────────────
// `<SomeContext.Provider value={...}>` → `<SomeContext value={...}>`
// `</SomeContext.Provider>` → `</SomeContext>`

function rewriteContextProvider(file: SourceFile) {
  let text = file.getFullText()
  // Opening tag: <Something.Provider
  text = text.replace(/<(\w+Context)\.Provider(\s)/g, "<$1$2")
  // Closing tag: </Something.Provider>
  text = text.replace(/<\/(\w+Context)\.Provider>/g, "</$1>")

  if (text !== file.getFullText()) {
    file.replaceWithText(text)
  }
}

// ─── Transform: createContext() → createContext<T | null>(null) ──────────────
// Only for cases without a default value argument

function fixCreateContextDefaults(file: SourceFile) {
  let text = file.getFullText()

  // Pattern: createContext<SomeType>() with no argument
  // → createContext<SomeType | null>(null)
  text = text.replace(
    /createContext<([^>]+)>\(\)/g,
    (match, typeParam) => {
      // If already has `| null`, don't double-add
      if (typeParam.includes("| null")) return match
      return `createContext<${typeParam} | null>(null)`
    }
  )

  if (text !== file.getFullText()) {
    file.replaceWithText(text)
  }
}

// ─── Transform: onMount → onSettled (call sites) ─────────────────────────────

function rewriteOnMountCalls(file: SourceFile) {
  let text = file.getFullText()
  text = text.replace(/\bonMount\(/g, "onSettled(")
  if (text !== file.getFullText()) {
    file.replaceWithText(text)
  }
}

// ─── Transform: createEffect single-arg → split-phase ───────────────────────
// This is complex and only 3 files have it. We'll handle simple patterns:
// createEffect(() => { ... onCleanup(() => ...) }) →
// Will flag these for manual review rather than risk incorrect transforms.

function flagCreateEffectForReview(file: SourceFile): string[] {
  const warnings: string[] = []
  const text = file.getFullText()
  const filePath = file.getFilePath()

  // Check for single-arg createEffect (no second function argument)
  // Simple heuristic: createEffect(() => { followed by onCleanup
  const lines = text.split("\n")
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("createEffect(()") || lines[i].includes("createEffect((")) {
      // Check if there's a comma before the closing `)` that would indicate split-phase
      // This is a rough heuristic — real split-phase has two function args
      let depth = 0
      let foundSecondArg = false
      let j = i
      while (j < lines.length) {
        for (const ch of lines[j]) {
          if (ch === "(") depth++
          if (ch === ")") {
            depth--
            if (depth === 0) break
          }
        }
        if (depth === 0) break
        j++
      }
      // For now, just flag it
      warnings.push(
        `${filePath}:${i + 1}: createEffect may need manual split-phase conversion`
      )
    }
  }
  return warnings
}

// ─── Transform: Remove DynamicProps import from @corvu/* ─────────────────────
// After @corvu/* → @corvu-next/*, check if DynamicProps needs updating

function fixCorvuDynamicProps(file: SourceFile) {
  // DynamicProps in corvu-next uses @solidjs/web, should be imported from there
  // Check if file imports DynamicProps from a corvu package
  for (const decl of getImportDeclarations(file)) {
    const spec = decl.getModuleSpecifierValue()
    if (spec.startsWith("@corvu-next/")) {
      const named = decl.getNamedImports()
      for (const n of named) {
        if (n.getName() === "DynamicProps") {
          // DynamicProps in corvu-next is re-exported from @solidjs/web or defined locally
          // Leave as-is — corvu-next should export it
        }
      }
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
  })

  // Add all registry source files
  const globs = [
    path.join(REGISTRY_DIR, "ui/**/*.tsx"),
    path.join(REGISTRY_DIR, "ui/**/*.ts"),
    path.join(REGISTRY_DIR, "examples/**/*.tsx"),
    path.join(REGISTRY_DIR, "examples/**/*.ts"),
    path.join(REGISTRY_DIR, "charts/**/*.tsx"),
    path.join(REGISTRY_DIR, "charts/**/*.ts"),
    path.join(REGISTRY_DIR, "blocks/**/*.tsx"),
    path.join(REGISTRY_DIR, "blocks/**/*.ts"),
    path.join(REGISTRY_DIR, "hooks/**/*.ts"),
    path.join(REGISTRY_DIR, "hooks/**/*.tsx"),
    path.join(REGISTRY_DIR, "lib/**/*.ts"),
    path.join(REGISTRY_DIR, "lib/**/*.tsx"),
  ]

  for (const glob of globs) {
    project.addSourceFilesAtPaths(glob)
  }

  const files = project.getSourceFiles()
  console.log(`Processing ${files.length} files...`)

  const allWarnings: string[] = []
  let transformedCount = 0

  for (const file of files) {
    const originalText = file.getFullText()

    // Order matters: do import renames before call-site rewrites
    // 1. Module specifier rewrites (kobalte, corvu, cmdk, solid-js/store)
    rewriteModuleSpecifiers(file)

    // 2. Move types to @solidjs/web (before renaming imports)
    moveTypesToSolidJsWeb(file)

    // 3. Rename imports: splitProps→omit, mergeProps→merge, onMount→onSettled
    renameSplitPropsImport(file)
    renameMergePropsImport(file)
    renameOnMountImport(file)

    // 4. Rewrite call sites
    rewriteMergePropsCalls(file) // must run before splitProps since splitProps may reference `merge` var
    rewriteSplitPropsCalls(file)
    rewriteOnMountCalls(file)

    // 5. Context patterns
    rewriteContextProvider(file)
    fixCreateContextDefaults(file)

    // 6. Corvu DynamicProps
    fixCorvuDynamicProps(file)

    // 7. Flag createEffect for manual review
    const warnings = flagCreateEffectForReview(file)
    allWarnings.push(...warnings)

    if (file.getFullText() !== originalText) {
      transformedCount++
    }
  }

  // Save all changes
  await project.save()

  console.log(`\nTransformed ${transformedCount}/${files.length} files.`)

  if (allWarnings.length > 0) {
    console.log(`\n⚠️  Manual review needed (${allWarnings.length} sites):`)
    for (const w of allWarnings) {
      console.log(`  ${w}`)
    }
  }

  console.log("\nDone. Run `tsc --noEmit` to check remaining type errors.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
