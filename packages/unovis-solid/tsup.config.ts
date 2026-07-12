import { defineConfig } from 'tsup'
import * as preset from 'tsup-preset-solid'

const preset_options: preset.PresetOptions = {
  entries: [
    {
      entry: 'src/index.ts',
      dev_entry: false,
    },
  ],
  drop_console: false,
  cjs: true,
}

export default defineConfig((config) => {
  const watching = !!config.watch
  const parsed_options = preset.parsePresetOptions(preset_options, watching)

  if (!watching) {
    const package_fields = preset.generatePackageExports(parsed_options)
    console.log(`package.json: \n\n${JSON.stringify(package_fields, null, 2)}\n\n`)
    preset.writePackageJson(package_fields)
  }

  const options = preset.generateTsupOptions(parsed_options)
  if (Array.isArray(options)) {
    return options.map(o => ({ ...o, dts: false }))
  }
  return { ...options, dts: false }
})
