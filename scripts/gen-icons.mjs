// Genera los iconos PNG de la PWA a partir del SVG.
// Uso: pnpm gen:icons
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'public', 'becario-icon.svg'))

const salidas = [
  [192, 'pwa-192x192.png'],
  [512, 'pwa-512x512.png'],
  [180, 'apple-touch-icon.png'],
]

for (const [size, nombre] of salidas) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(join(root, 'public', nombre))
  console.log('✓', nombre)
}
