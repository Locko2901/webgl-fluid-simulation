
export interface HSV {
  h: number
  s: number
  v: number
}

export interface HSL {
  h: number
  s: number
  l: number
}

export interface RGBColor {
  r: number
  g: number
  b: number
}

export function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const sanitized = (hex ?? '').trim()

  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(sanitized)
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
  }

  result = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(sanitized)
  if (result) {
    return {
      r: parseInt(result[1] + result[1], 16),
      g: parseInt(result[2] + result[2], 16),
      b: parseInt(result[3] + result[3], 16),
    }
  }

  return null
}

export function hexToRgb(hex: string, fallback: RGBColor = { r: 255, g: 255, b: 255 }): RGBColor {
  const parsed = parseHex(hex)
  if (!parsed) {
    console.warn(`Invalid hex color: ${hex}, using fallback`)
    return fallback
  }
  return parsed
}

export function hexToRgbNormalized(hex: string, fallback: RGBColor = { r: 1, g: 1, b: 1 }): RGBColor {
  const parsed = parseHex(hex)
  if (!parsed) {
    console.warn(`Invalid hex color: ${hex}, using fallback`)
    return fallback
  }
  return {
    r: parsed.r / 255,
    g: parsed.g / 255,
    b: parsed.b / 255,
  }
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function hexToHsv(hex: string): HSV {
  const rgb = hexToRgb(hex)
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min

  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max

  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60
        break
      case g:
        h = ((b - r) / d + 2) * 60
        break
      case b:
        h = ((r - g) / d + 4) * 60
        break
    }
  }

  return { h, s, v }
}

export function hsvToHex(hsv: HSV): string {
  const { h, s, v } = hsv
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c

  let r = 0, g = 0, b = 0

  if (h < 60) { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else { r = c; b = x }

  return rgbToHex(
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  )
}

export function hsvToHsl(hsv: HSV): HSL {
  const { h, s, v } = hsv
  const l = v * (1 - s / 2)
  const sl = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l)
  return { h, s: sl * 100, l: l * 100 }
}

export function hslToHsv(hsl: HSL): HSV {
  const { h, s: sPercent, l: lPercent } = hsl
  const s = sPercent / 100
  const l = lPercent / 100
  const v = l + s * Math.min(l, 1 - l)
  const sv = v === 0 ? 0 : 2 * (1 - l / v)
  return { h, s: sv, v }
}

export function hsvToRgb(h: number, s: number, v: number): RGBColor {
  let r = 0, g = 0, b = 0
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
  }

  return { r, g, b }
}
