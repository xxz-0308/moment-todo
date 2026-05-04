// electron-builder afterPack hook — embed icon into Windows exe
const fs = require('fs')
const path = require('path')
const { Resource } = require('resedit')

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

  console.log(`Embedding icon into ${exePath}...`)
  const exeData = fs.readFileSync(exePath)
  const icoData = fs.readFileSync(icoPath)

  const icoCount = icoData.readUInt16LE(4)
  const icons = []
  for (let i = 0; i < icoCount; i++) {
    const off = 6 + i * 16
    icons.push({
      width: icoData.readUInt8(off) || 256,
      height: icoData.readUInt8(off + 1) || 256,
      bitCount: 32,
      planes: 1,
      id: i + 1,
      size: icoData.readUInt32LE(off + 8),
      data: icoData.slice(icoData.readUInt32LE(off + 12), icoData.readUInt32LE(off + 12) + icoData.readUInt32LE(off + 8)),
    })
  }

  const resource = Resource.from(exeData)
  resource.outputResource({ icon: icons.map(({ width, height, bitCount, planes, id, data }) => ({ width, height, bitCount, planes, id, data })) })
  fs.writeFileSync(exePath, Buffer.from(resource.generate()))
  console.log(`Icon embedded: ${icons.map(i => i.width + 'x' + i.height).join(', ')}`)
}
