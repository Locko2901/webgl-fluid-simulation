import type { FluidSimulation } from '../FluidSimulation'
import type { GUI } from '../gui'
import { config, updateConfig, COLOR_PALETTES } from '../Config'
import type { ColorPalette } from '../types'

interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
}

export class KeyboardHandler {
  private simulation: FluidSimulation
  private gui: GUI
  private shortcuts: Map<string, KeyboardShortcut> = new Map()
  private boundHandler: (e: KeyboardEvent) => void

  constructor(simulation: FluidSimulation, gui: GUI, _canvas: HTMLCanvasElement) {
    this.simulation = simulation
    this.gui = gui

    this.registerShortcuts()
    this.boundHandler = this.handleKeyDown.bind(this)
    window.addEventListener('keydown', this.boundHandler)
  }

  private registerShortcuts(): void {
    const paletteKeys = Object.keys(COLOR_PALETTES) as ColorPalette[]

    this.addShortcut(' ', 'Random splats', () => {
      this.simulation.addSplats(Math.floor(Math.random() * 8) + 5)
    })

    this.addShortcut('r', 'Reset simulation', () => {
      this.simulation.reset()
    })

    this.addShortcut('p', 'Toggle pause', () => {
      updateConfig('PAUSED', !config.PAUSED)
    })

    this.addShortcut('b', 'Toggle bloom', () => {
      updateConfig('BLOOM', !config.BLOOM)
      this.gui.updateCheckbox('bloom', config.BLOOM)
    })

    this.addShortcut('m', 'Toggle marbling', () => {
      updateConfig('MARBLING', !config.MARBLING)
      this.gui.updateCheckbox('marbling', config.MARBLING)
    })

    this.addShortcut('h', 'Toggle UI', () => {
      updateConfig('SHOW_UI', !config.SHOW_UI)
      const guiEl = document.getElementById('gui')
      const infoEl = document.querySelector('.info') as HTMLElement
      if (guiEl) guiEl.style.display = config.SHOW_UI ? '' : 'none'
      if (infoEl) infoEl.style.display = config.SHOW_UI ? '' : 'none'
    })

    this.addShortcut('s', 'Screenshot', () => {
      this.gui.takeScreenshot()
    })

    for (let i = 0; i <= 9; i++) {
      const key = i.toString()
      const idx = i === 0 ? 9 : i - 1
      if (idx < paletteKeys.length) {
        this.addShortcut(key, `Palette: ${paletteKeys[idx]}`, () => {
          updateConfig('COLOR_PALETTE', paletteKeys[idx])
          this.gui.updateSelect('color-palette', paletteKeys[idx])
        })
      }
    }
  }

  private addShortcut(key: string, description: string, action: () => void): void {
    this.shortcuts.set(key.toLowerCase(), { key, description, action })
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    const key = e.key.toLowerCase()
    const shortcut = this.shortcuts.get(key)

    if (shortcut) {
      if (key === ' ') e.preventDefault()
      shortcut.action()
    }
  }

  dispose(): void {
    window.removeEventListener('keydown', this.boundHandler)
    this.shortcuts.clear()
  }

  getShortcutList(): { key: string; description: string }[] {
    return Array.from(this.shortcuts.values()).map(({ key, description }) => ({
      key: key === ' ' ? 'Space' : key.toUpperCase(),
      description,
    }))
  }

  destroy(): void {
    window.removeEventListener('keydown', this.boundHandler)
  }
}
