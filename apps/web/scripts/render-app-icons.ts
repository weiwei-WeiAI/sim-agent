/** Render PWA install icons from the Sim Harness desktop tile. */

import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Vector source shared with the desktop application. */
export const TILE_SOURCE = fileURLToPath(new URL('../../desktop/resources/icon.svg', import.meta.url))
/** Generated PWA assets. */
export const ICON_OUTPUT_DIRECTORY = fileURLToPath(new URL('../public/', import.meta.url))
export const MASKABLE_ARTWORK_SCALE = 0.45
export const MASKABLE_SAFE_RADIUS_RATIO = 0.4

export interface AppIconVariant {
  readonly file: string
  readonly size: number
  readonly kind: 'tile' | 'maskable'
}

export const APP_ICON_VARIANTS: readonly AppIconVariant[] = [
  { file: 'icon-192.png', size: 192, kind: 'tile' },
  { file: 'icon-512.png', size: 512, kind: 'tile' },
  { file: 'icon-maskable-512.png', size: 512, kind: 'maskable' },
  { file: 'apple-touch-icon.png', size: 180, kind: 'tile' },
]

export function tileDocument(source: string): string {
  if (!/^<svg\b/u.test(source.trim())) throw new Error('app icons: the tile source has no root element')
  if (!source.includes('id="tray-glyph"')) {
    throw new Error('app icons: the Sim Harness tile has no brand mark')
  }
  return source
}

export function maskableDocument(source: string): string {
  const tile = tileDocument(source)
  return tile.replace('<g id="tray-glyph">',
    `<g id="tray-glyph" transform="translate(512 512) scale(${MASKABLE_ARTWORK_SCALE}) translate(-512 -512)">`)
}

async function renderPng(document: string, size: number): Promise<Buffer> {
  const { default: sharp } = await import('sharp')
  return sharp(Buffer.from(document)).resize(size, size, { kernel: 'lanczos3' }).png().toBuffer()
}

export async function renderAppIcons(source: string): Promise<readonly { variant: AppIconVariant; png: Buffer }[]> {
  return Promise.all(APP_ICON_VARIANTS.map(async variant => ({
    variant,
    png: await renderPng(variant.kind === 'maskable' ? maskableDocument(source) : tileDocument(source), variant.size),
  })))
}

async function main(): Promise<void> {
  const icons = await renderAppIcons(await readFile(TILE_SOURCE, 'utf8'))
  await Promise.all(icons.map(({ variant, png }) => writeFile(resolve(ICON_OUTPUT_DIRECTORY, variant.file), png)))
  console.info(`app icons: wrote ${icons.map(icon => icon.variant.file).join(', ')} to ${ICON_OUTPUT_DIRECTORY}`)
}

if (process.argv[1] !== undefined && import.meta.filename === resolve(process.argv[1])) await main()
