/**
 * Home-Page Hydration Regression Test
 *
 * Spawns the docs dev server, loads `/` in a headless browser,
 * captures console output, and asserts that hydration state doesn't regress
 * beyond the known baseline.
 *
 * KNOWN ISSUES (tracked separately, not regressions):
 *   - 1 route-level hydration mismatch (key: 00000700025cf001000112x)
 *     caused by structural SSR/client divergence in the shell or layout
 *     stack — NOT caused by CardsDemo (verified: removing cards doesn't help).
 *   - Up to 10 "unclaimed server-rendered node(s)" from header/hero links.
 *
 * The test ensures these counts do NOT increase. A passing test means
 * no new hydration regressions were introduced.
 *
 * Run:
 *   pnpm exec vitest run apps/docs/src/hydration-regression.test.ts
 *
 * Requires: playwright globally installed with chromium browser.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { type ChildProcess, spawn } from "node:child_process"
import { resolve } from "node:path"

const DOCS_DIR = resolve(import.meta.dirname, "..")
const DEV_PORT = 3199 // Use a unique port to avoid conflicts
const DEV_URL = `http://localhost:${DEV_PORT}`
const STARTUP_TIMEOUT = 30_000 // 30s for dev server to start
const PAGE_SETTLE_TIME = 5_000 // 5s for hydration to complete

/**
 * Known baseline values — these should only DECREASE (never increase).
 * When you fix a hydration issue, lower the corresponding baseline number.
 */
const KNOWN_BASELINE = {
  /** Route-level "Error in route match: __root__" warnings */
  routeMatchErrors: 1,
  /** "Hydration Mismatch. Unable to find DOM nodes" warnings */
  hydrationMismatchErrors: 1,
  /** Maximum unclaimed server-rendered nodes in any single warning */
  maxUnclaimedNodes: 10,
}

let devServer: ChildProcess | null = null

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
      if (res.ok || res.status === 200) return
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Dev server did not start within ${timeoutMs}ms`)
}

describe("Home-page hydration regression", () => {
  beforeAll(async () => {
    // Start the docs dev server on a unique port
    devServer = spawn("pnpm", ["exec", "vite", "dev", "--port", String(DEV_PORT)], {
      cwd: DOCS_DIR,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NODE_ENV: "development" },
    })

    // Capture server errors for debugging
    let serverStderr = ""
    devServer.stderr?.on("data", (d: Buffer) => {
      serverStderr += d.toString()
    })

    devServer.on("error", (err) => {
      throw new Error(`Failed to spawn dev server: ${err.message}\n${serverStderr}`)
    })

    await waitForServer(DEV_URL, STARTUP_TIMEOUT)
  }, STARTUP_TIMEOUT + 5000)

  afterAll(() => {
    if (devServer) {
      devServer.kill("SIGTERM")
      devServer = null
    }
  })

  it("does not regress beyond the known hydration baseline", async () => {
    // Dynamic import so the test fails gracefully if playwright isn't available
    const { chromium } = await import("playwright")

    const browser = await chromium.launch({ headless: true })
    try {
      const context = await browser.newContext()
      const page = await context.newPage()

      // Collect all console messages
      const consoleMessages: { type: string; text: string }[] = []
      page.on("console", (msg) => {
        consoleMessages.push({ type: msg.type(), text: msg.text() })
      })

      // Navigate and wait for hydration to settle
      await page.goto(DEV_URL, { waitUntil: "networkidle" })
      // Extra settle time for async hydration
      await page.waitForTimeout(PAGE_SETTLE_TIME)

      // Extract warnings and errors
      const allMessages = [...consoleMessages]

      // ─── Check 1: Route-level hydration errors ──────────────────────────
      const routeMatchErrors = allMessages.filter((m) =>
        m.text.includes("Error in route match: __root__")
      )
      expect(
        routeMatchErrors.length,
        `Route match errors increased beyond baseline (${KNOWN_BASELINE.routeMatchErrors}).\n` +
          `Found ${routeMatchErrors.length} — a new hydration regression was introduced.\n` +
          `Messages:\n${routeMatchErrors.map((m) => m.text).join("\n")}`
      ).toBeLessThanOrEqual(KNOWN_BASELINE.routeMatchErrors)

      // ─── Check 2: Hydration mismatch errors ─────────────────────────────
      const hydrationMismatchErrors = allMessages.filter((m) =>
        m.text.includes("Hydration Mismatch. Unable to find DOM nodes")
      )
      expect(
        hydrationMismatchErrors.length,
        `Hydration mismatch errors increased beyond baseline (${KNOWN_BASELINE.hydrationMismatchErrors}).\n` +
          `Found ${hydrationMismatchErrors.length} — a new hydration regression was introduced.\n` +
          `Messages:\n${hydrationMismatchErrors.map((m) => m.text).join("\n")}`
      ).toBeLessThanOrEqual(KNOWN_BASELINE.hydrationMismatchErrors)

      // ─── Check 3: Unclaimed node counts ─────────────────────────────────
      const unclaimedWarnings = allMessages.filter((m) =>
        m.text.includes("unclaimed server-rendered node(s)")
      )

      for (const warning of unclaimedWarnings) {
        const match = /(\d+)\s+unclaimed server-rendered node/.exec(warning.text)
        if (match) {
          const count = parseInt(match[1], 10)
          expect(
            count,
            `Unclaimed node count ${count} exceeds known baseline of ${KNOWN_BASELINE.maxUnclaimedNodes}.\n` +
              `A new hydration regression was introduced.\n` +
              `Message: ${warning.text}`
          ).toBeLessThanOrEqual(KNOWN_BASELINE.maxUnclaimedNodes)
        }
      }

      // ─── Check 4: No new hydration-related fatal errors ─────────────────
      const fatalHydrationErrors = allMessages.filter(
        (m) =>
          m.type === "error" &&
          (m.text.includes("hydration") || m.text.includes("Hydration"))
      )
      expect(
        fatalHydrationErrors,
        `Found new fatal hydration errors (not in known baseline):\n${fatalHydrationErrors.map((m) => m.text).join("\n")}`
      ).toHaveLength(0)
    } finally {
      await browser.close()
    }
  }, 60_000) // 60s timeout for the full browser test
})
