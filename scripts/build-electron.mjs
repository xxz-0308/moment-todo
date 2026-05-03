import * as esbuild from 'esbuild'
import { mkdirSync, copyFileSync, existsSync } from 'fs'

if (!existsSync('dist-electron')) {
  mkdirSync('dist-electron')
}

// Build main process
await esbuild.build({
  entryPoints: ['electron/main.ts'],
  outfile: 'dist-electron/main.js',
  bundle: true,
  platform: 'node',
  target: 'node24',
  external: ['electron', 'sql.js'],
  format: 'cjs',
  sourcemap: true,
})

// Build preload
await esbuild.build({
  entryPoints: ['electron/preload.ts'],
  outfile: 'dist-electron/preload.js',
  bundle: true,
  platform: 'node',
  target: 'node24',
  external: ['electron'],
  format: 'cjs',
  sourcemap: true,
})

// Copy tray icon if it exists
if (existsSync('assets/tray-icon.png')) {
  copyFileSync('assets/tray-icon.png', 'dist-electron/tray-icon.png')
}

console.log('Electron build complete')
