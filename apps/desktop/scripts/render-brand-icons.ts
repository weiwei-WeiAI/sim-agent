import { copyFile, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { packIco, renderTrayIconEntries } from './render-tray-icon.ts'
import sharp from 'sharp'

const sourcePath = fileURLToPath(new URL('../../../packages/client/ui-brand-sim/src/client/assets/xfusion.svg', import.meta.url))
const desktop = fileURLToPath(new URL('../resources/', import.meta.url))
const installer = fileURLToPath(new URL('../installer/assets/', import.meta.url))
const web = fileURLToPath(new URL('../../web/public/', import.meta.url))
const welcome = fileURLToPath(new URL('../renderer/assets/welcome-brand.svg', import.meta.url))

function symbolMarkup(source: string): string {
  const document = source.slice(source.indexOf('<svg')).trim()
  const opening = /^<svg\b[^>]*>/u.exec(document)
  if (!opening || !document.endsWith('</svg>')) throw new Error('brand icon: invalid xFusion SVG')
  return document.slice(opening[0].length, -'</svg>'.length)
}

function tile(markup: string, maskable = false): string {
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">\n`
    + '<rect width="1024" height="1024" fill="#fff"/>\n'
    + '<rect x="1" y="1" width="1022" height="1022" fill="none" stroke="#e8e8e8" stroke-width="2"/>\n'
    + `<g id="tray-glyph"${maskable ? ' transform="translate(512 512) scale(0.45) translate(-512 -512)"' : ''}>`
    + `<svg x="162" y="162" width="700" height="700" viewBox="0 0 78 60" preserveAspectRatio="xMidYMid meet">${markup}</svg>`
    + '</g></svg>'
}

function installerBrand(markup: string, textColor: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="196" viewBox="0 0 600 196">\n`
    + '<circle cx="300" cy="68" r="56" fill="#fff" stroke="#e8e8e8"/>\n'
    + `<svg x="254" y="33" width="92" height="70" viewBox="0 0 78 60" preserveAspectRatio="xMidYMid meet">${markup}</svg>\n`
    + `<text x="300" y="173" fill="${textColor}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="600">Sim Harness</text>\n`
    + '</svg>'
}

function uninstallerSidebar(markup: string): string {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="164" height="314" viewBox="0 0 164 314">\n'
    + '<rect width="164" height="314" fill="#f4f5f7"/>\n'
    + '<rect x="22" y="89" width="120" height="120" rx="8" fill="#fff" stroke="#e8e8e8"/>\n'
    + `<svg x="42" y="117" width="80" height="62" viewBox="0 0 78 60" preserveAspectRatio="xMidYMid meet">${markup}</svg>\n`
    + '</svg>'
}

async function writePng(svg: string, path: string, width: number, height = width): Promise<void> {
  await sharp(Buffer.from(svg)).resize(width, height).png().toFile(path)
}

const markup = symbolMarkup(await readFile(sourcePath, 'utf8'))
const regular = tile(markup)
const maskable = tile(markup, true)
const regularBrand = installerBrand(markup, '#202124')
const darkBrand = installerBrand(markup, '#fff')
const iconPath = (name: string): string => join(desktop, name)
const webPath = (name: string): string => join(web, name)
const installerPath = (name: string): string => join(installer, name)
await Promise.all([
  writeFile(iconPath('icon.svg'), regular),
  writeFile(iconPath('icon-windows.svg'), regular),
  writeFile(iconPath('icon-macos.svg'), regular),
  writePng(regular, iconPath('icon.png'), 1024),
  writePng(regular, iconPath('icon-windows.png'), 1024),
  writePng(regular, iconPath('icon-macos.png'), 1024),
  writePng(regular, webPath('icon-192.png'), 192),
  writePng(regular, webPath('icon-512.png'), 512),
  writePng(maskable, webPath('icon-maskable-512.png'), 512),
  writePng(regular, webPath('apple-touch-icon.png'), 180),
  writePng(regularBrand, installerPath('brand.png'), 600, 196),
  writePng(regularBrand, installerPath('brand-2x.png'), 1200, 392),
  writePng(darkBrand, installerPath('brand-dark.png'), 600, 196),
  writePng(darkBrand, installerPath('brand-dark-2x.png'), 1200, 392),
  writePng(uninstallerSidebar(markup), installerPath('uninstaller-sidebar.png'), 164, 314),
  copyFile(sourcePath, welcome),
])
const trayEntries = await renderTrayIconEntries(Buffer.from(regular))
await writeFile(iconPath('tray-windows.ico'), packIco(trayEntries))
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 78 60"><g>${markup}</g></svg>`
await Promise.all([
  writeFile(webPath('favicon.svg'), favicon),
  writeFile(webPath('favicon-dark.svg'), favicon.replaceAll('fill="#231815"', 'fill="#fff"')),
])
console.info('brand icons: rendered Sim Harness icons from the xFusion mark')
