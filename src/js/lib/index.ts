import { FluidSimulation } from '../FluidSimulation'
import { SimulationRunner } from '../SimulationRunner'
import { InputHandler, KeyboardHandler } from '../input'
import { GUI } from '../gui'
import { updateConfig, resetConfig, getConfig, initConfig, setStorageKey, COLOR_PALETTES } from '../Config'
import { generateColor } from '../Color'
import styles from '../../styles/main.css?inline'
import type { FluidConfig, RGB, ColorPalette, CustomColor } from '../types'

export type { FluidConfig, RGB, ColorPalette, CustomColor }
export { COLOR_PALETTES }

GUI.injectStyles(styles)

export interface FluidSimulatorOptions {
  canvas: HTMLCanvasElement | string
  showGUI?: boolean
  enableKeyboard?: boolean
  enableInput?: boolean
  autoStart?: boolean
  loadSavedConfig?: boolean
  initialConfig?: Partial<FluidConfig>
  forceHideUI?: boolean
  storageKey?: string
}

export class FluidSimulator {
  private simulation: FluidSimulation
  private runner: SimulationRunner
  private gui: GUI | null = null
  private inputHandler: InputHandler | null = null
  private _keyboardHandler: KeyboardHandler | null = null
  private canvas: HTMLCanvasElement

  static create(canvas: HTMLCanvasElement | string, options?: Partial<FluidSimulatorOptions>): FluidSimulator {
    return new FluidSimulator({ canvas, ...options })
  }

  constructor(options: FluidSimulatorOptions) {
    if (typeof options.canvas === 'string') {
      const el = document.querySelector(options.canvas) as HTMLCanvasElement
      if (!el) throw new Error(`Canvas not found: ${options.canvas}`)
      this.canvas = el
    } else {
      this.canvas = options.canvas
    }

    if (options.storageKey) {
      setStorageKey(options.storageKey)
    }

    if (options.loadSavedConfig !== false) {
      initConfig()
    }

    if (options.initialConfig) {
      for (const [key, value] of Object.entries(options.initialConfig)) {
        updateConfig(key as keyof FluidConfig, value as FluidConfig[keyof FluidConfig])
      }
    }

    this.simulation = new FluidSimulation(this.canvas)

    if (options.showGUI !== false) {
      this.gui = new GUI(this.simulation, { forceHideUI: options.forceHideUI })
    }

    if (options.enableInput !== false) {
      this.inputHandler = new InputHandler(this.canvas, this.simulation)
    }

    if (options.enableKeyboard !== false && this.gui) {
      this._keyboardHandler = new KeyboardHandler(this.simulation, this.gui, this.canvas)
    }

    this.runner = new SimulationRunner({
      simulation: this.simulation,
      inputHandler: this.inputHandler,
      onFrame: (fps) => {
        const fpsEl = document.getElementById('fps')
        if (fpsEl) {
          fpsEl.textContent = `${fps} FPS`
        }
      },
    })

    if (options.autoStart !== false) {
      this.start()
    }
  }

  start(): void {
    this.runner.start()
  }

  stop(): void {
    this.runner.stop()
  }

  pause(paused?: boolean): void {
    updateConfig('PAUSED', paused ?? !getConfig().PAUSED)
  }

  isPaused(): boolean {
    return getConfig().PAUSED
  }

  addSplats(count?: number): void {
    this.simulation.addSplats(count ?? Math.floor(Math.random() * 5) + 3)
  }

  splat(x: number, y: number, dx: number, dy: number, color?: RGB): void {
    this.simulation.splat(x, y, dx, dy, color ?? generateColor())
  }

  setConfig<K extends keyof FluidConfig>(key: K, value: FluidConfig[K]): void {
    updateConfig(key, value)
  }

  getConfig(): FluidConfig {
    return getConfig()
  }

  resetConfig(): void {
    resetConfig()
  }

  getSimulation(): FluidSimulation {
    return this.simulation
  }

  getGUI(): GUI | null {
    return this.gui
  }

  getKeyboardHandler(): KeyboardHandler | null {
    return this._keyboardHandler
  }

  takeScreenshot(): void {
    this.gui?.['takeScreenshot']?.()
  }

  destroy(): void {
    this.stop()
    this.gui?.destroy()
  }
}
