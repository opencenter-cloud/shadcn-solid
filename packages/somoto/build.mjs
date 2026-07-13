// Sequential build: tsup CLI + parallel array configs loses one entry file.
// Run configs one at a time via the programmatic API so both dist/index.js
// (client) and dist/server.js (SSR) are emitted.
import * as preset from 'tsup-preset-solid'
import { build } from 'tsup'

const parsed = preset.parsePresetOptions({
  entries: [
    {
      entry: 'src/index.ts',
      dev_entry: false,
      server_entry: true,
    },
  ],
  drop_console: false,
  cjs: true,
}, false)

// Write the exports/main/module/types fields matching the entry set above.
const packageFields = preset.generatePackageExports(parsed)
preset.writePackageJson(packageFields)

const options = preset.generateTsupOptions(parsed)

for (const o of options) {
  await build({ ...o, dts: false, injectStyle: true, config: false })
}
