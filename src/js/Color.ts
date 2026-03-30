import type { RGB, ColorPalette } from './types'
import { config, COLOR_PALETTES } from './Config'
import { hsvToRgb, hexToRgbNormalized } from './utils/color'

class RGBCycleState {
  private colorIndex = 0
  private colorT = 0

  update(dt: number, speed: number, colorCount: number): void {
    if (colorCount <= 1) return
    this.colorT += dt * speed
    while (this.colorT >= 1) {
      this.colorT -= 1
      this.colorIndex = (this.colorIndex + 1) % colorCount
    }
  }

  getInterpolation(colorCount: number): { index: number; nextIndex: number; t: number } {
    return {
      index: this.colorIndex,
      nextIndex: (this.colorIndex + 1) % colorCount,
      t: this.colorT,
    }
  }

  reset(): void {
    this.colorIndex = 0
    this.colorT = 0
  }
}

const rgbCycleState = new RGBCycleState()

export function HSVtoRGB(h: number, s: number, v: number): RGB {
  return hsvToRgb(h, s, v)
}

export function hexToRGB(hex: string): RGB {
  return hexToRgbNormalized(hex)
}

export function generateColor(): RGB {
  if (config.COLOR_PALETTE === 'custom') {
    const enabledColors = config.CUSTOM_COLORS.filter(c => c.enabled)
    if (enabledColors.length === 0) {
      return { r: 0.15, g: 0.15, b: 0.15 }
    }
    const customColor = enabledColors[Math.floor(Math.random() * enabledColors.length)]
    const rgb = hexToRGB(customColor.hex)
    const variation = 0.9 + Math.random() * 0.1
    const intensity = config.COLOR_INTENSITY
    return {
      r: rgb.r * intensity * variation,
      g: rgb.g * intensity * variation,
      b: rgb.b * intensity * variation,
    }
  }

  const palette = COLOR_PALETTES[config.COLOR_PALETTE]
  const colorDef = palette.colors[Math.floor(Math.random() * palette.colors.length)]
  const [hue, saturation] = colorDef

  const h = hue + (Math.random() - 0.5) * 0.05
  const s = saturation * (0.9 + Math.random() * 0.1)

  const c = HSVtoRGB(h, s, 1.0)
  const intensity = config.COLOR_INTENSITY
  c.r *= intensity
  c.g *= intensity
  c.b *= intensity
  return c
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  }
}

function getColorsForRGBMode(): RGB[] {
  if (config.COLOR_PALETTE === 'custom') {
    const enabledColors = config.CUSTOM_COLORS.filter(c => c.enabled)
    if (enabledColors.length === 0) {
      return [{ r: 0.15, g: 0.15, b: 0.15 }]
    }
    return enabledColors.map(c => {
      const rgb = hexToRGB(c.hex)
      const intensity = config.COLOR_INTENSITY
      return { r: rgb.r * intensity, g: rgb.g * intensity, b: rgb.b * intensity }
    })
  }

  const palette = COLOR_PALETTES[config.COLOR_PALETTE]
  const intensity = config.COLOR_INTENSITY
  return palette.colors.map(([hue, saturation]) => {
    const c = HSVtoRGB(hue, saturation, 1.0)
    return { r: c.r * intensity, g: c.g * intensity, b: c.b * intensity }
  })
}

export function updateRGBCycle(dt: number): void {
  if (!config.RGB_MODE) return

  const colors = getColorsForRGBMode()
  rgbCycleState.update(dt, config.RGB_SPEED, colors.length)
}

export function getRGBCycleColor(): RGB {
  const colors = getColorsForRGBMode()
  if (colors.length === 0) {
    return { r: 0.15, g: 0.15, b: 0.15 }
  }
  if (colors.length === 1) {
    return colors[0]
  }

  const { index, nextIndex, t } = rgbCycleState.getInterpolation(colors.length)
  const color = lerpRGB(colors[index], colors[nextIndex], t)

  const variation = 0.95 + Math.random() * 0.1
  return {
    r: color.r * variation,
    g: color.g * variation,
    b: color.b * variation,
  }
}

export function getPaletteNames(): { id: ColorPalette; name: string }[] {
  return Object.entries(COLOR_PALETTES).map(([id, palette]) => ({
    id: id as ColorPalette,
    name: palette.name
  }))
}

export function resetRGBCycle(): void {
  rgbCycleState.reset()
}
