// Rasterize icon.svg to PNGs at all sizes, using ONLY the single SVG source
import sharp from 'sharp'
import fs from 'fs'

const svg = fs.readFileSync('public/icon.svg')

// Generate all PNGs from the same SVG
const pngConfigs = [
  { size: 512, out: 'public/icon.png' },
  { size: 32,  out: 'public/icon-32.png' },
]

for (const { size, out } of pngConfigs) {
  const png = await sharp(svg).resize(size, size).png().toBuffer()
  fs.writeFileSync(out, png)
  console.log(`  ${out} (${size}x${size}, ${png.length} bytes)`)
}

// Build ICO: all sizes from the same SVG
const icoSizes = [16, 32, 48, 256]
const images = []
for (const size of icoSizes) {
  images.push(await sharp(svg).resize(size, size).png().toBuffer())
}

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)    // reserved
header.writeUInt16LE(1, 2)    // type: ICO
header.writeUInt16LE(4, 4)    // count

let dataOffset = 6 + 16 * 4
let entries = Buffer.alloc(0)
let imageData = Buffer.alloc(0)

for (let i = 0; i < 4; i++) {
  const size = [16, 32, 48, 256][i]
  const png = images[i]
  const entry = Buffer.alloc(16)
  entry.writeUInt8(size === 256 ? 0 : size, 0)  // width
  entry.writeUInt8(size === 256 ? 0 : size, 1)  // height
  entry.writeUInt8(0, 2)    // palette
  entry.writeUInt8(0, 3)    // reserved
  entry.writeUInt16LE(1, 4) // planes
  entry.writeUInt16LE(32, 6)// bpp
  entry.writeUInt32LE(png.length, 8)   // size
  entry.writeUInt32LE(dataOffset, 12)  // offset
  entries = Buffer.concat([entries, entry])
  imageData = Buffer.concat([imageData, png])
  dataOffset += png.length
}

fs.writeFileSync('public/icon.ico', Buffer.concat([header, entries, imageData]))
console.log('ICO generated with sizes: 16, 32, 48, 256')
