import type { FluidConfig, ColorPalette } from './types'

export const COLOR_PALETTES: Record<ColorPalette, { name: string; colors: [number, number][] }> = {
  rainbow: {
    name: 'Rainbow',
    colors: [
      [0, 1],
      [0.1, 1],
      [0.2, 1],
      [0.3, 1],
      [0.4, 1],
      [0.5, 1],
      [0.6, 1],
      [0.7, 1],
      [0.8, 1],
      [0.9, 1],
    ],
  },
  ocean: {
    name: 'Ocean',
    colors: [
      [0.5, 0.9],
      [0.52, 0.85],
      [0.55, 0.95],
      [0.58, 0.8],
      [0.6, 0.9],
    ],
  },
  fire: {
    name: 'Fire',
    colors: [
      [0.0, 1],
      [0.02, 0.95],
      [0.05, 0.9],
      [0.08, 0.85],
      [0.1, 1],
    ],
  },
  neon: {
    name: 'Neon',
    colors: [
      [0.83, 1],
      [0.5, 1],
      [0.33, 1],
      [0.16, 1],
    ],
  },
  sunset: {
    name: 'Sunset',
    colors: [
      [0.0, 1],
      [0.05, 0.9],
      [0.08, 0.95],
      [0.95, 0.85],
      [0.9, 0.8],
    ],
  },
  aurora: {
    name: 'Aurora',
    colors: [
      [0.4, 0.9],
      [0.45, 0.95],
      [0.5, 0.85],
      [0.55, 1],
      [0.85, 0.9],
    ],
  },
  cyberpunk: {
    name: 'Cyberpunk',
    colors: [
      [0.83, 1],
      [0.92, 1],
      [0.5, 1],
      [0.58, 0.9],
    ],
  },
  forest: {
    name: 'Forest',
    colors: [
      [0.25, 0.7],
      [0.28, 0.8],
      [0.33, 0.6],
      [0.35, 0.75],
      [0.4, 0.5],
    ],
  },
  monochrome: {
    name: 'Monochrome',
    colors: [
      [0, 0],
      [0, 0.1],
      [0, 0.05],
      [0, 0.02],
    ],
  },
  pastel: {
    name: 'Pastel',
    colors: [
      [0.0, 0.4],
      [0.1, 0.35],
      [0.55, 0.4],
      [0.75, 0.35],
      [0.9, 0.4],
    ],
  },
  custom: {
    name: 'Custom',
    colors: [],
  },
}

const DEFAULT_CONFIG: FluidConfig = {
  SHOW_UI: true,
  AUTO_SAVE: true,
  SIM_RESOLUTION: 256,
  DYE_RESOLUTION: 1024,
  DENSITY_DISSIPATION: 0.98,
  VELOCITY_DISSIPATION: 0.99,
  VELOCITY_DAMPING: 0.5,
  PRESSURE_ITERATIONS: 20,
  CURL: 30,
  SPLAT_RADIUS: 0.25,
  SPLAT_FORCE: 6000,
  AUTO_SPLATS: true,
  AUTO_SPLAT_FORCE: 500,
  BLOOM: true,
  BLOOM_INTENSITY: 0.8,
  BLOOM_THRESHOLD: 0.6,
  SHARPNESS: 0.0,
  VIGNETTE: 0.5,
  TURBULENCE: 0.0,
  MARBLING: false,
  MARBLING_INTENSITY: 0.5,
  COLOR_PALETTE: 'custom',
  CUSTOM_COLORS: [
    { hex: '#FF00FF', enabled: true },
    { hex: '#00ff00', enabled: false },
    { hex: '#0000ff', enabled: false },
  ],
  PAUSED: false,
  RGB_MODE: true,
  RGB_SPEED: 1.0,
  COLOR_INTENSITY: 0.15,
  TARGET_FPS: 60,
  TRANSPARENT: false,
}

let STORAGE_KEY = 'fluidSimConfig'

export function setStorageKey(key: string): void {
  STORAGE_KEY = key
}

export function getStorageKey(): string {
  return STORAGE_KEY
}

export const config: FluidConfig = { ...DEFAULT_CONFIG }

const CONFIG_BOUNDS: Partial<Record<keyof FluidConfig, { min: number; max: number }>> = {
  SIM_RESOLUTION: { min: 32, max: 1024 },
  DYE_RESOLUTION: { min: 128, max: 4096 },
  DENSITY_DISSIPATION: { min: 0.9, max: 1 },
  VELOCITY_DISSIPATION: { min: 0.9, max: 1 },
  VELOCITY_DAMPING: { min: 0, max: 5 },
  PRESSURE_ITERATIONS: { min: 1, max: 100 },
  CURL: { min: 0, max: 200 },
  SPLAT_RADIUS: { min: 0.01, max: 2 },
  SPLAT_FORCE: { min: 100, max: 20000 },
  AUTO_SPLAT_FORCE: { min: 10, max: 2000 },
  BLOOM_INTENSITY: { min: 0, max: 5 },
  BLOOM_THRESHOLD: { min: 0, max: 1 },
  SHARPNESS: { min: 0, max: 5 },
  VIGNETTE: { min: 0, max: 1 },
  TURBULENCE: { min: 0, max: 2 },
  MARBLING_INTENSITY: { min: 0.1, max: 5 },
  RGB_SPEED: { min: 0.1, max: 10 },
  COLOR_INTENSITY: { min: 0.01, max: 1 },
  TARGET_FPS: { min: 0, max: 300 },
}

export function updateConfig<K extends keyof FluidConfig>(key: K, value: FluidConfig[K]): void {
  const bounds = CONFIG_BOUNDS[key]
  if (bounds && typeof value === 'number') {
    value = Math.max(bounds.min, Math.min(bounds.max, value)) as FluidConfig[K]
  }
  config[key] = value

  // Auto-save if enabled (but don't save when toggling AUTO_SAVE itself to avoid recursion)
  if (config.AUTO_SAVE && key !== 'AUTO_SAVE') {
    saveConfig()
  }
}

export function resetConfig(): void {
  Object.assign(config, DEFAULT_CONFIG)
  clearSavedConfig()
}

export function getConfig(): FluidConfig {
  return { ...config }
}

export function saveConfig(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (e) {
    console.warn('Failed to save config:', e)
  }
}

function isValidConfig(obj: unknown): obj is Partial<FluidConfig> {
  if (typeof obj !== 'object' || obj === null) return false
  const validKeys: (keyof FluidConfig)[] = [
    'SHOW_UI', 'AUTO_SAVE', 'SIM_RESOLUTION', 'DYE_RESOLUTION', 'DENSITY_DISSIPATION', 'VELOCITY_DISSIPATION',
    'VELOCITY_DAMPING', 'PRESSURE_ITERATIONS', 'CURL', 'SPLAT_RADIUS', 'SPLAT_FORCE',
    'AUTO_SPLATS', 'AUTO_SPLAT_FORCE', 'BLOOM', 'BLOOM_INTENSITY', 'BLOOM_THRESHOLD',
    'COLOR_PALETTE', 'CUSTOM_COLORS', 'PAUSED', 'SHARPNESS', 'VIGNETTE', 'TURBULENCE',
    'MARBLING', 'MARBLING_INTENSITY', 'RGB_MODE', 'RGB_SPEED', 'COLOR_INTENSITY', 'TARGET_FPS',
    'TRANSPARENT'
  ]
  const objKeys = Object.keys(obj)
  return objKeys.every(key => validKeys.includes(key as keyof FluidConfig))
}

export function loadConfig(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (isValidConfig(parsed)) {
        Object.assign(config, DEFAULT_CONFIG, parsed)
        return true
      }
      console.warn('Invalid config format, using defaults')
    }
  } catch (e) {
    console.warn('Failed to load config:', e)
  }
  return false
}

export function clearSavedConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    console.warn('Failed to clear saved config:', e)
  }
}

export function updateAndSave<K extends keyof FluidConfig>(key: K, value: FluidConfig[K]): void {
  updateConfig(key, value)
  saveConfig()
}

export function initConfig(): void {
  loadConfig()
}
