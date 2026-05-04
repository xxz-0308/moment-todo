// scripts/generate-icons.mjs
// Generates public/icon.png (512) and public/icon-32.png (32)
// Diamond + check design using raw pixel buffers + zlib PNG encoding

import fs from 'fs'
import zlib from 'zlib'

function crc32(buf) {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    table[n] = c
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td), 0)
  return Buffer.concat([len, td, c])
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(px - x1, py - y1)
  let t = ((px - x1) * dx + (py - y1) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

function png(size, rgbaAt) {
  const lines = []
  for (let y = 0; y < size; y++) {
    const line = Buffer.alloc(1 + size * 4)
    for (let x = 0; x < size; x++) {
      const idx = 1 + x * 4
      const [r, g, b, a] = rgbaAt(x, y, size)
      line[idx] = r; line[idx + 1] = g; line[idx + 2] = b; line[idx + 3] = a
    }
    lines.push(line)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(lines))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Anti-aliased diamond (rotated square) with rounded corners
function diamondDist(x, y, size) {
  const cx = size / 2, cy = size / 2
  const half = size * 0.32
  const cornerR = size * 0.015
  // Rotate point to diamond space (45 degrees)
  const cos = 0.70710678, sin = 0.70710678
  const dx = (x - cx) * cos + (y - cy) * sin
  const dy = -(x - cx) * sin + (y - cy) * cos
  // Distance to axis-aligned square in rotated space
  return Math.max(Math.abs(dx), Math.abs(dy)) - half + cornerR
}

// Check mark — uses the exact same geometry as icon.svg and TitleBar inline SVG
// icon.svg polyline: 170,270 230,330 350,200 in 512x512 viewBox
// Normalized to [0,1] then scaled to target size
function inCheck(x, y, size) {
  // Scaled coordinates from icon.svg check mark polyline
  const scale = size / 512
  const sx = 170 * scale, sy = 270 * scale    // bottom-left start
  const mx = 230 * scale, my = 330 * scale    // bend (lowest point)
  const ex = 350 * scale, ey = 200 * scale    // top-right tip

  // Stroke width: proportional, but with reasonable min/max
  const w = Math.max(1.0, Math.min(size * 0.07, size < 64 ? 1.8 : 4.5))

  const d1 = distToSegment(x, y, sx, sy, mx, my)
  const d2 = distToSegment(x, y, mx, my, ex, ey)
  return Math.min(d1, d2) < w
}

function rgbaAt(x, y, size) {
  // Indigo gradient: bottom-left #6366f1 → top-right #818cf8
  const t = (x + y) / (2 * size)
  const r = Math.round(99 + t * (129 - 99))
  const g = Math.round(102 + t * (140 - 102))
  const b = Math.round(241 + t * (248 - 241))

  const d = diamondDist(x + 0.5, y + 0.5, size)
  const inDiamond = d < 0

  if (!inDiamond) return [0, 0, 0, 0]

  // Anti-alias
  let alpha = 255
  if (d > -1.5) alpha = Math.round(255 * Math.min(1, -d / 1.5))
  alpha = Math.max(0, Math.min(255, alpha))

  if (inCheck(x, y, size)) return [255, 255, 255, alpha]

  // Highlight at top-left corner of diamond
  const hlDx = x / size - 0.3
  const hlDy = y / size - 0.3
  const hlDist = Math.sqrt(hlDx * hlDx + hlDy * hlDy)
  if (d < -2 && hlDist < 0.5) {
    const hl = Math.round(20 * (1 - hlDist / 0.5))
    return [Math.min(255, r + hl), Math.min(255, g + hl), Math.min(255, b + hl), alpha]
  }

  return [r, g, b, alpha]
}

// Generate 512 and 32 PNGs
fs.writeFileSync('public/icon.png', png(512, rgbaAt))
fs.writeFileSync('public/icon-32.png', png(32, (x, y, s) => rgbaAt(x * 16, y * 16, 512)))
console.log('Generated public/icon.png (512x512) and public/icon-32.png (32x32)')
