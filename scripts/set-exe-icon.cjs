// electron-builder afterPack hook — embed icon into Windows exe using resedit
const fs = require('fs')
const path = require('path')
const { NtExecutable, NtExecutableResource, Data } = require('resedit')

exports.default = async function (context) {
  const { appOutDir, packager } = context
  if (packager.platform.name !== 'windows') return

  const exeName = `${packager.appInfo.productFilename}.exe`
  const exePath = path.join(appOutDir, exeName)
  const icoPath = path.join(__dirname, '..', 'public', 'icon.ico')

  if (!fs.existsSync(exePath)) {
    console.warn(`Exe not found at ${exePath}, skipping icon embed`)
    return
  }
  if (!fs.existsSync(icoPath)) {
    console.warn(`ICO not found at ${icoPath}, skipping icon embed`)
    return
  }

  console.log(`Embedding icon into ${exeName}...`)

  const exeData = fs.readFileSync(exePath)
  const icoData = fs.readFileSync(icoPath)

  // Parse ICO to get icon entries
  const icoCount = icoData.readUInt16LE(4)
  const iconEntries = []
  for (let i = 0; i < icoCount; i++) {
    const off = 6 + i * 16
    const w = icoData.readUInt8(off) || 256
    const h = icoData.readUInt8(off + 1) || 256
    const size = icoData.readUInt32LE(off + 8)
    const dataOff = icoData.readUInt32LE(off + 12)
    iconEntries.push({
      width: w,
      height: h,
      bitCount: 32,
      planes: 1,
      id: i + 1,
      data: icoData.slice(dataOff, dataOff + size),
    })
  }

  // Open exe, replace icon resource
  const exe = NtExecutable.from(exeData)
  const res = NtExecutableResource.from(exe)
  res.outputResource({ icon: iconEntries })
  res.outputResource(undefined) // flush

  // Generate new exe binary
  const newExeData = Buffer.from(exe.generate())
  fs.writeFileSync(exePath, newExeData)
  console.log(`Icon embedded: ${iconEntries.map(i => i.width + 'x' + i.height).join(', ')}`)
}
