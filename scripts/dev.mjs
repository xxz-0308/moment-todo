import { spawn, execSync } from 'child_process'
import { createServer } from 'vite'

async function startDev() {
  // Build electron files first
  execSync('node scripts/build-electron.mjs', { stdio: 'inherit' })

  // Start Vite dev server
  const server = await createServer({
    configFile: './vite.config.ts',
  })
  await server.listen()
  server.printUrls()

  // Start Electron
  const electronPath = execSync('node -e "console.log(require(\'electron\'))"', { encoding: 'utf-8' }).trim()

  const electronProcess = spawn(electronPath, ['.', '--dev'], {
    env: {
      ...process.env,
      NODE_ENV: 'development',
    },
    stdio: 'inherit',
  })

  electronProcess.on('close', () => {
    server.close()
    process.exit(0)
  })
}

startDev().catch(console.error)
