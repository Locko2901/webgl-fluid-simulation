import { updateConfig, config, COLOR_PALETTES, saveConfig, loadConfig, resetConfig, clearSavedConfig } from '../Config'
import { createColorPicker } from './ColorPicker'
import { createCustomDropdown } from './CustomDropdown'
import { detectRefreshRate } from '../RefreshRate'
import type { FluidSimulation } from '../FluidSimulation'
import type { FluidConfig, ColorPalette, CustomColor } from '../types'

interface SliderBinding {
  id: string
  key: keyof FluidConfig
  reinitFBO?: boolean
}

interface CheckboxBinding {
  id: string
  key: keyof FluidConfig
}

export interface GUIOptions {
  forceHideUI?: boolean
}

const SLIDER_BINDINGS: SliderBinding[] = [
  { id: 'sim-resolution', key: 'SIM_RESOLUTION', reinitFBO: true },
  { id: 'dye-resolution', key: 'DYE_RESOLUTION', reinitFBO: true },
  { id: 'density-dissipation', key: 'DENSITY_DISSIPATION' },
  { id: 'velocity-dissipation', key: 'VELOCITY_DISSIPATION' },
  { id: 'velocity-damping', key: 'VELOCITY_DAMPING' },
  { id: 'pressure-iterations', key: 'PRESSURE_ITERATIONS' },
  { id: 'curl', key: 'CURL' },
  { id: 'splat-radius', key: 'SPLAT_RADIUS' },
  { id: 'splat-force', key: 'SPLAT_FORCE' },
  { id: 'bloom-intensity', key: 'BLOOM_INTENSITY' },
  { id: 'bloom-threshold', key: 'BLOOM_THRESHOLD' },
  { id: 'sharpness', key: 'SHARPNESS' },
  { id: 'vignette', key: 'VIGNETTE' },
  { id: 'turbulence', key: 'TURBULENCE' },
  { id: 'auto-splat-force', key: 'AUTO_SPLAT_FORCE' },
  { id: 'marbling-intensity', key: 'MARBLING_INTENSITY' },
  { id: 'rgb-speed', key: 'RGB_SPEED' },
  { id: 'color-intensity', key: 'COLOR_INTENSITY' },
]

const CHECKBOX_BINDINGS: CheckboxBinding[] = [
  { id: 'auto-splats', key: 'AUTO_SPLATS' },
  { id: 'bloom', key: 'BLOOM' },
  { id: 'marbling', key: 'MARBLING' },
  { id: 'rgb-mode', key: 'RGB_MODE' },
  { id: 'transparent', key: 'TRANSPARENT' },
]

export class GUI {
  simulation: FluidSimulation
  collapsed = true
  customPaletteContainer: HTMLElement | null = null
  activeDropdown: HTMLElement | null = null
  activeColorPicker: HTMLElement | null = null
  private container: HTMLElement | null = null
  private infoBar: HTMLElement | null = null
  private forceHideUI: boolean = false

  private static stylesInjected = false
  private static injectedStyles: string | null = null

  static injectStyles(css: string): void {
    GUI.injectedStyles = css
  }

  constructor(simulation: FluidSimulation, options?: GUIOptions) {
    this.simulation = simulation
    this.forceHideUI = options?.forceHideUI ?? false
    this.ensureDOM()
    this.init()
    this.setupGlobalClickHandler()
    this.applyInitialVisibility()
  }

  private applyInitialVisibility(): void {
    const shouldHide = this.forceHideUI || !config.SHOW_UI
    if (shouldHide) {
      if (this.container) this.container.style.display = 'none'
      if (this.infoBar) this.infoBar.style.display = 'none'
      if (this.forceHideUI && config.SHOW_UI) {
        config.SHOW_UI = false
      }
    }
  }

  private ensureDOM(): void {
    if (!GUI.stylesInjected && GUI.injectedStyles) {
      const styleEl = document.createElement('style')
      styleEl.id = 'fluid-sim-styles'
      styleEl.textContent = GUI.injectedStyles
      document.head.appendChild(styleEl)
      GUI.stylesInjected = true
    }

    if (document.getElementById('gui')) return

    this.container = document.createElement('div')
    this.container.id = 'gui'
    this.container.className = 'gui'
    this.container.innerHTML = this.buildGUIHTML()
    document.body.appendChild(this.container)

    this.infoBar = document.createElement('div')
    this.infoBar.className = 'info'
    this.infoBar.innerHTML = `
      <span class="info-text">Click/drag to interact · Space: splats · R: reset · P: pause · B: bloom · M: marbling · H: hide UI</span>
      <span class="fps" id="fps">60 FPS</span>
    `
    document.body.appendChild(this.infoBar)
  }

  private buildGUIHTML(): string {
    return `
      <div class="gui-header">
        <span>Settings</span>
        <button id="gui-toggle" class="gui-toggle"><i class="fa-solid fa-plus"></i></button>
      </div>
      <div id="gui-content" class="gui-content collapsed">
        ${this.buildSection('Brush', [
          this.buildSlider('splat-radius', 'Radius', 'Size of the color splat', 0.05, 1, 0.25, 0.05),
          this.buildSlider('splat-force', 'Force', 'How much force is applied', 1000, 10000, 6000, 500),
        ])}
        ${this.buildSection('Automation', [
          this.buildCheckboxRow('auto-splats', 'Auto Splats', 'Automatically generate random splats', true),
          this.buildSlider('auto-splat-force', 'Auto Force', 'Force of automatic splats', 50, 1000, 500, 50),
          this.buildCheckboxRow('marbling', 'Marbling', 'Creates paint-like streaky patterns', false),
          this.buildSlider('marbling-intensity', 'Marbling Intensity', 'Strength of marbling currents', 0.1, 2, 0.5, 0.1),
        ])}
        ${this.buildSection('Physics', [
          this.buildSlider('curl', 'Curl', 'Amplifies rotational motion', 0, 100, 30, 5),
          this.buildSlider('turbulence', 'Turbulence', 'Adds random chaotic motion', 0, 1, 0, 0.1),
          this.buildSlider('velocity-dissipation', 'Velocity Decay', 'How quickly fluid movement fades', 0.9, 1, 0.99, 0.01),
          this.buildSlider('velocity-damping', 'Damping', 'Resistance that increases with speed', 0, 2, 0.5, 0.1),
          this.buildSlider('density-dissipation', 'Color Decay', 'How quickly colors fade', 0.9, 1, 0.98, 0.01),
          this.buildSlider('pressure-iterations', 'Pressure Accuracy', 'Accuracy of pressure calculation', 5, 50, 20, 5),
        ])}
        ${this.buildSection('Colors', [
          '<div class="gui-group"><label data-tooltip="Select a preset color palette">Palette</label><select id="color-palette"></select></div>',
          '<div id="custom-palette-container" class="custom-palette-container" style="display: none;"><div class="gui-group-label">Custom Colors</div><div id="custom-color-list" class="custom-color-list"></div><button id="add-color-btn" class="btn btn-small">+ Add Color</button></div>',
          this.buildSlider('color-intensity', 'Intensity', 'Brightness/intensity of the colors', 0.05, 0.5, 0.15, 0.01),
          this.buildCheckboxRow('rgb-mode', 'Color Cycling', 'Continuously cycle through palette colors', false),
          this.buildSlider('rgb-speed', 'Cycle Speed', 'How fast colors cycle', 0.1, 3, 1, 0.1),
        ])}
        ${this.buildSection('Effects', [
          this.buildCheckboxRow('bloom', 'Bloom', 'Adds a glowing effect to bright areas', true),
          this.buildSlider('bloom-intensity', 'Bloom Intensity', 'Strength of the bloom glow effect', 0, 2, 0.8, 0.1),
          this.buildSlider('bloom-threshold', 'Bloom Threshold', 'Brightness level required for bloom', 0, 1, 0.6, 0.05),
          this.buildSlider('sharpness', 'Sharpness', 'Enhances edge definition', 0, 2, 0, 0.1),
          this.buildSlider('vignette', 'Vignette', 'Darkens the edges of the screen', 0, 1, 0.5, 0.1),
          this.buildCheckboxRow('transparent', 'Transparent', 'Remove background for transparent canvas', false),
        ])}
        ${this.buildSection('Performance', [
          this.buildSlider('sim-resolution', 'Sim Resolution', 'Resolution of fluid physics', 64, 512, 256, 64),
          this.buildSlider('dye-resolution', 'Dye Resolution', 'Resolution of color rendering', 512, 2048, 1024, 256),
          this.buildSlider('target-fps', 'FPS Limit', 'FPS limit', 1, 60, 60, 1),
          this.buildCheckboxRow('benchmark-mode', 'Benchmark Mode', 'Unlock higher resolution limits', false),
          '<div id="unlimited-fps-row" class="gui-group gui-row" style="display: none;"><label data-tooltip="Remove FPS cap entirely">Unlimited FPS</label><input type="checkbox" id="unlimited-fps"></div>',
        ])}
        <div class="gui-actions">
          <button id="random-splat-btn" class="btn">Random Splat</button>
          <button id="screenshot-btn" class="btn">Screenshot</button>
          <div class="settings-dropdown">
            <button id="settings-btn" class="btn">Settings</button>
            <div id="settings-submenu" class="settings-submenu">
              ${this.forceHideUI ? '' : '<label class="settings-submenu-checkbox"><input type="checkbox" id="hide-ui-startup"> Hide UI on Startup</label>'}
              <label class="settings-submenu-checkbox"><input type="checkbox" id="auto-save-config" checked> Auto-save Settings</label>
              <div class="settings-submenu-divider"></div>
              <button id="save-settings-btn" class="settings-submenu-btn">Save</button>
              <button id="load-settings-btn" class="settings-submenu-btn">Load</button>
              <button id="clear-settings-btn" class="settings-submenu-btn">Clear</button>
              <div class="settings-submenu-divider"></div>
              <button id="reset-btn" class="settings-submenu-btn">Reset Simulation</button>
            </div>
          </div>
        </div>
      </div>
    `
  }

  private buildSection(title: string, content: string[]): string {
    return `<div class="gui-section"><div class="gui-section-title">${title}</div>${content.join('')}</div>`
  }

  private buildSlider(id: string, label: string, tooltip: string, min: number, max: number, value: number, step: number): string {
    return `<div class="gui-group"><label data-tooltip="${tooltip}">${label}</label><input type="range" id="${id}" min="${min}" max="${max}" value="${value}" step="${step}"><span id="${id}-value">${value}</span></div>`
  }

  private buildCheckboxRow(id: string, label: string, tooltip: string, checked: boolean): string {
    return `<div class="gui-group gui-row"><label data-tooltip="${tooltip}">${label}</label><input type="checkbox" id="${id}"${checked ? ' checked' : ''}></div>`
  }

  destroy(): void {
    this.container?.remove()
    this.infoBar?.remove()
  }

  setupGlobalClickHandler(): void {
    document.addEventListener('click', (e) => {
      if (this.activeDropdown && !this.activeDropdown.contains(e.target as Node)) {
        this.activeDropdown.classList.remove('open')
        this.activeDropdown = null
      }
      if (this.activeColorPicker && !this.activeColorPicker.contains(e.target as Node)) {
        this.activeColorPicker.classList.remove('open')
        this.activeColorPicker = null
      }
    })
  }

  init(): void {
    const toggleBtn = document.getElementById('gui-toggle')
    const content = document.getElementById('gui-content')
    const header = document.querySelector('.gui-header')

    if (header && content && toggleBtn) {
      const icon = toggleBtn.querySelector('i')
      header.addEventListener('click', () => {
        this.collapsed = !this.collapsed
        content.classList.toggle('collapsed', this.collapsed)
        if (icon) {
          icon.classList.toggle('fa-plus', this.collapsed)
          icon.classList.toggle('fa-minus', !this.collapsed)
        }
      })

      if (this.collapsed) {
        content.classList.add('collapsed')
        if (icon) {
          icon.classList.add('fa-plus')
          icon.classList.remove('fa-minus')
        }
      }
    }

    for (const binding of SLIDER_BINDINGS) {
      this.bindSlider(binding.id, binding.key, binding.reinitFBO ?? false)
    }
    for (const binding of CHECKBOX_BINDINGS) {
      this.bindCheckbox(binding.id, binding.key)
    }

    this.initFpsSlider()
    this.initColorPaletteSelector()
    this.initCustomPaletteUI()

    const randomSplatBtn = document.getElementById('random-splat-btn')
    if (randomSplatBtn) {
      randomSplatBtn.addEventListener('click', () => {
        this.simulation.addSplats(Math.floor(Math.random() * 5) + 3)
      })
    }

    const screenshotBtn = document.getElementById('screenshot-btn')
    if (screenshotBtn) {
      screenshotBtn.addEventListener('click', () => this.takeScreenshot())
    }

    this.initSettingsSubmenu()

    this.refreshAllControls()
  }

  initSettingsSubmenu(): void {
    const settingsBtn = document.getElementById('settings-btn')
    const settingsSubmenu = document.getElementById('settings-submenu')

    if (settingsBtn && settingsSubmenu) {
      settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        settingsSubmenu.classList.toggle('open')
      })

      document.addEventListener('click', (e) => {
        if (!settingsSubmenu.contains(e.target as Node) && !settingsBtn.contains(e.target as Node)) {
          settingsSubmenu.classList.remove('open')
        }
      })
    }

    const hideUiCheckbox = document.getElementById('hide-ui-startup') as HTMLInputElement
    if (hideUiCheckbox) {
      hideUiCheckbox.checked = !config.SHOW_UI
      hideUiCheckbox.addEventListener('change', () => {
        updateConfig('SHOW_UI', !hideUiCheckbox.checked)
      })
    }

    const autoSaveCheckbox = document.getElementById('auto-save-config') as HTMLInputElement
    const saveBtn = document.getElementById('save-settings-btn')
    const loadBtn = document.getElementById('load-settings-btn')

    const updateAutoSaveButtonVisibility = () => {
      const hidden = config.AUTO_SAVE
      if (saveBtn) (saveBtn as HTMLElement).style.display = hidden ? 'none' : ''
      if (loadBtn) (loadBtn as HTMLElement).style.display = hidden ? 'none' : ''
    }

    if (autoSaveCheckbox) {
      autoSaveCheckbox.checked = config.AUTO_SAVE
      updateAutoSaveButtonVisibility()
      autoSaveCheckbox.addEventListener('change', () => {
        updateConfig('AUTO_SAVE', autoSaveCheckbox.checked)
        if (autoSaveCheckbox.checked) {
          saveConfig()
        }
        updateAutoSaveButtonVisibility()
      })
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        saveConfig()
        this.showToast('Settings saved!')
      })
    }

    if (loadBtn) {
      loadBtn.addEventListener('click', () => {
        if (loadConfig()) {
          this.refreshAllControls()
          this.showToast('Settings loaded!')
        } else {
          this.showToast('No saved settings found')
        }
      })
    }

    const clearBtn = document.getElementById('clear-settings-btn')
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        clearSavedConfig()
        resetConfig()
        this.refreshAllControls()
        this.simulation.reset()
        this.showToast('Settings cleared!')
      })
    }

    const resetBtn = document.getElementById('reset-btn')
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        resetConfig()
        this.refreshAllControls()
        this.simulation.initFramebuffers()
        this.simulation.reset()
        this.showToast('Reset to defaults')
      })
    }
  }

  showToast(message: string): void {
    const existing = document.querySelector('.toast')
    if (existing) existing.remove()

    const toast = document.createElement('div')
    toast.className = 'toast'
    toast.textContent = message
    document.body.appendChild(toast)

    setTimeout(() => toast.classList.add('show'), 10)
    setTimeout(() => {
      toast.classList.remove('show')
      setTimeout(() => toast.remove(), 300)
    }, 2000)
  }

  refreshAllControls(): void {
    for (const { id, key } of SLIDER_BINDINGS) {
      const slider = document.getElementById(id) as HTMLInputElement | null
      const valueEl = document.getElementById(`${id}-value`)
      if (slider) {
        slider.value = String(config[key])
        if (valueEl) valueEl.textContent = String(config[key])
      }
    }

    const fpsSlider = document.getElementById('target-fps') as HTMLInputElement | null
    const fpsSliderGroup = fpsSlider?.parentElement
    const fpsValue = document.getElementById('target-fps-value')
    const unlimitedFpsCheckbox = document.getElementById('unlimited-fps') as HTMLInputElement | null
    const unlimitedFpsRow = document.getElementById('unlimited-fps-row')
    const benchmarkCheckbox = document.getElementById('benchmark-mode') as HTMLInputElement | null
    const isUnlimited = config.TARGET_FPS === 0
    const isBenchmark = benchmarkCheckbox?.checked ?? false

    if (fpsSlider && fpsValue) {
      if (isUnlimited) {
        fpsValue.textContent = '∞'
        if (isBenchmark) {
          fpsSlider.disabled = true
          if (fpsSliderGroup) fpsSliderGroup.style.opacity = '0.5'
        }
      } else {
        fpsSlider.value = String(config.TARGET_FPS)
        fpsValue.textContent = String(config.TARGET_FPS)
        fpsSlider.disabled = false
        if (fpsSliderGroup) fpsSliderGroup.style.opacity = '1'
      }
    }

    if (unlimitedFpsCheckbox) {
      unlimitedFpsCheckbox.checked = isUnlimited
    }

    if (unlimitedFpsRow) {
      unlimitedFpsRow.style.display = isBenchmark ? 'flex' : 'none'
    }

    for (const { id, key } of CHECKBOX_BINDINGS) {
      const checkbox = document.getElementById(id) as HTMLInputElement | null
      if (checkbox) {
        checkbox.checked = config[key] as boolean
      }
    }

    const dropdownTrigger = document.querySelector('.custom-dropdown-trigger') as HTMLElement | null
    if (dropdownTrigger) {
      const palette = COLOR_PALETTES[config.COLOR_PALETTE]
      if (palette) dropdownTrigger.textContent = palette.name
    }
    this.toggleCustomPaletteVisibility(config.COLOR_PALETTE === 'custom')

    const hideUiCheckbox = document.getElementById('hide-ui-startup') as HTMLInputElement | null
    if (hideUiCheckbox) {
      hideUiCheckbox.checked = !config.SHOW_UI
    }

    const autoSaveCheckbox = document.getElementById('auto-save-config') as HTMLInputElement | null
    const saveBtn = document.getElementById('save-settings-btn') as HTMLElement | null
    const loadBtn = document.getElementById('load-settings-btn') as HTMLElement | null
    if (autoSaveCheckbox) {
      autoSaveCheckbox.checked = config.AUTO_SAVE
    }
    const hidden = config.AUTO_SAVE
    if (saveBtn) saveBtn.style.display = hidden ? 'none' : ''
    if (loadBtn) loadBtn.style.display = hidden ? 'none' : ''
  }

  takeScreenshot(): void {
    const canvas = this.simulation.canvas
    const gl = this.simulation.gl

    if (config.TRANSPARENT) {
      const width = canvas.width
      const height = canvas.height
      const pixels = new Uint8Array(width * height * 4)
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

      const offscreen = document.createElement('canvas')
      offscreen.width = width
      offscreen.height = height
      const ctx = offscreen.getContext('2d')
      if (!ctx) return

      const imageData = ctx.createImageData(width, height)
      const data = imageData.data

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIdx = ((height - 1 - y) * width + x) * 4
          const dstIdx = (y * width + x) * 4
          const r = pixels[srcIdx]
          const g = pixels[srcIdx + 1]
          const b = pixels[srcIdx + 2]
          const luma = 0.299 * r + 0.587 * g + 0.114 * b
          data[dstIdx] = r
          data[dstIdx + 1] = g
          data[dstIdx + 2] = b
          data[dstIdx + 3] = Math.round(luma)
        }
      }

      ctx.putImageData(imageData, 0, 0)
      const link = document.createElement('a')
      link.download = `fluid-${Date.now()}.png`
      link.href = offscreen.toDataURL('image/png')
      link.click()
    } else {
      const link = document.createElement('a')
      link.download = `fluid-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
  }

  initFpsSlider(): void {
    const fpsSlider = document.getElementById('target-fps') as HTMLInputElement | null
    const fpsValue = document.getElementById('target-fps-value')
    const fpsSliderGroup = fpsSlider?.parentElement
    const simSlider = document.getElementById('sim-resolution') as HTMLInputElement | null
    const simValue = document.getElementById('sim-resolution-value')
    const dyeSlider = document.getElementById('dye-resolution') as HTMLInputElement | null
    const dyeValue = document.getElementById('dye-resolution-value')
    const benchmarkCheckbox = document.getElementById('benchmark-mode') as HTMLInputElement | null
    const unlimitedFpsRow = document.getElementById('unlimited-fps-row')
    const unlimitedFpsCheckbox = document.getElementById('unlimited-fps') as HTMLInputElement | null

    if (!fpsSlider || !fpsValue) return

    const normalLimits = { sim: 512, dye: 2048 }
    const benchmarkLimits = { sim: 1024, dye: 4096 }

    let monitorRefreshRate = 60
    let savedFpsValue = config.TARGET_FPS > 0 ? config.TARGET_FPS : 60

    detectRefreshRate().then((rate) => {
      monitorRefreshRate = rate
      fpsSlider.max = String(rate)
      if (config.TARGET_FPS > rate && config.TARGET_FPS !== 0) {
        updateConfig('TARGET_FPS', rate)
        fpsSlider.value = String(rate)
        fpsValue.textContent = String(rate)
        savedFpsValue = rate
      }
    })

    const isUnlimited = config.TARGET_FPS === 0
    if (isUnlimited) {
      fpsSlider.value = String(savedFpsValue)
      fpsValue.textContent = '∞'
    } else {
      fpsSlider.value = String(config.TARGET_FPS)
      fpsValue.textContent = String(config.TARGET_FPS)
      savedFpsValue = config.TARGET_FPS
    }

    fpsSlider.addEventListener('input', () => {
      const value = Number(fpsSlider.value)
      savedFpsValue = value
      updateConfig('TARGET_FPS', value)
      fpsValue.textContent = String(value)
      if (unlimitedFpsCheckbox) unlimitedFpsCheckbox.checked = false
    })

    if (unlimitedFpsCheckbox) {
      unlimitedFpsCheckbox.checked = isUnlimited
      unlimitedFpsCheckbox.addEventListener('change', () => {
        if (unlimitedFpsCheckbox.checked) {
          savedFpsValue = Number(fpsSlider.value) || monitorRefreshRate
          updateConfig('TARGET_FPS', 0)
          fpsValue.textContent = '∞'
          if (fpsSliderGroup) fpsSliderGroup.style.opacity = '0.5'
          fpsSlider.disabled = true
        } else {
          updateConfig('TARGET_FPS', savedFpsValue)
          fpsSlider.value = String(savedFpsValue)
          fpsValue.textContent = String(savedFpsValue)
          if (fpsSliderGroup) fpsSliderGroup.style.opacity = '1'
          fpsSlider.disabled = false
        }
      })

      if (isUnlimited && benchmarkCheckbox?.checked) {
        if (fpsSliderGroup) fpsSliderGroup.style.opacity = '0.5'
        fpsSlider.disabled = true
      }
    }

    if (benchmarkCheckbox) {
      benchmarkCheckbox.addEventListener('change', () => {
        const isBenchmark = benchmarkCheckbox.checked
        const limits = isBenchmark ? benchmarkLimits : normalLimits

        if (unlimitedFpsRow) unlimitedFpsRow.style.display = isBenchmark ? 'flex' : 'none'

        if (simSlider) simSlider.max = String(limits.sim)
        if (dyeSlider) dyeSlider.max = String(limits.dye)

        if (isBenchmark) {
          this.showToast('Benchmark mode enabled!')
        } else {
          if (unlimitedFpsCheckbox?.checked) {
            unlimitedFpsCheckbox.checked = false
            updateConfig('TARGET_FPS', savedFpsValue)
            fpsSlider.value = String(savedFpsValue)
            fpsValue.textContent = String(savedFpsValue)
            if (fpsSliderGroup) fpsSliderGroup.style.opacity = '1'
            fpsSlider.disabled = false
          }

          if (simSlider && simValue && config.SIM_RESOLUTION > limits.sim) {
            simSlider.value = String(limits.sim)
            updateConfig('SIM_RESOLUTION', limits.sim)
            simValue.textContent = String(limits.sim)
            this.simulation.initFramebuffers()
          }

          if (dyeSlider && dyeValue && config.DYE_RESOLUTION > limits.dye) {
            dyeSlider.value = String(limits.dye)
            updateConfig('DYE_RESOLUTION', limits.dye)
            dyeValue.textContent = String(limits.dye)
            this.simulation.initFramebuffers()
          }
        }
      })

      if (benchmarkCheckbox.checked && unlimitedFpsRow) {
        unlimitedFpsRow.style.display = 'flex'
      }
    }
  }

  initColorPaletteSelector(): void {
    const select = document.getElementById('color-palette') as HTMLSelectElement | null
    if (!select) return

    select.classList.add('hidden')

    const options: { value: string; label: string }[] = []
    for (const [id, palette] of Object.entries(COLOR_PALETTES)) {
      options.push({ value: id, label: palette.name })
    }

    const dropdown = createCustomDropdown(
      options,
      config.COLOR_PALETTE,
      (value) => {
        const paletteValue = value as ColorPalette
        updateConfig('COLOR_PALETTE', paletteValue)
        this.toggleCustomPaletteVisibility(paletteValue === 'custom')
      },
      () => this.activeDropdown,
      (el) => {
        this.activeDropdown = el
      }
    )

    select.parentNode?.insertBefore(dropdown, select.nextSibling)
  }

  initCustomPaletteUI(): void {
    this.customPaletteContainer = document.getElementById('custom-palette-container')
    if (!this.customPaletteContainer) return

    this.renderCustomColors()

    const addBtn = document.getElementById('add-color-btn')
    if (addBtn) {
      addBtn.addEventListener('click', () => this.addCustomColor())
    }

    this.toggleCustomPaletteVisibility(config.COLOR_PALETTE === 'custom')
  }

  toggleCustomPaletteVisibility(visible: boolean): void {
    if (this.customPaletteContainer) {
      this.customPaletteContainer.style.display = visible ? 'block' : 'none'
    }
  }

  renderCustomColors(): void {
    const colorList = document.getElementById('custom-color-list')
    if (!colorList) return

    colorList.innerHTML = ''

    config.CUSTOM_COLORS.forEach((color, index) => {
      const colorRow = document.createElement('div')
      colorRow.className = 'custom-color-row'

      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.checked = color.enabled
      checkbox.className = 'custom-color-checkbox'
      checkbox.addEventListener('change', () => {
        const current = config.CUSTOM_COLORS[index]
        this.updateCustomColor(index, { ...current, enabled: checkbox.checked })
      })

      const colorPicker = createColorPicker(
        color.hex,
        (newHex) => {
          const current = config.CUSTOM_COLORS[index]
          this.updateCustomColor(index, { ...current, hex: newHex })
        },
        () => this.activeColorPicker,
        (el) => {
          this.activeColorPicker = el
        }
      )

      const removeBtn = document.createElement('button')
      removeBtn.className = 'custom-color-remove'
      removeBtn.textContent = '×'
      removeBtn.addEventListener('click', () => this.removeCustomColor(index))

      colorRow.appendChild(checkbox)
      colorRow.appendChild(colorPicker)
      colorRow.appendChild(removeBtn)
      colorList.appendChild(colorRow)
    })
  }

  addCustomColor(): void {
    const randomHex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
    const newColors: CustomColor[] = [...config.CUSTOM_COLORS, { hex: randomHex, enabled: true }]
    updateConfig('CUSTOM_COLORS', newColors)
    this.renderCustomColors()
  }

  removeCustomColor(index: number): void {
    if (config.CUSTOM_COLORS.length <= 1) return
    const newColors = config.CUSTOM_COLORS.filter((_, i) => i !== index)
    updateConfig('CUSTOM_COLORS', newColors)
    this.renderCustomColors()
  }

  updateCustomColor(index: number, color: CustomColor): void {
    const newColors = [...config.CUSTOM_COLORS]
    newColors[index] = color
    updateConfig('CUSTOM_COLORS', newColors)
  }

  bindSlider(elementId: string, configKey: keyof FluidConfig, reinitFBO = false): void {
    const slider = document.getElementById(elementId) as HTMLInputElement | null
    const valueDisplay = document.getElementById(`${elementId}-value`)

    if (slider && valueDisplay) {
      slider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value)
        updateConfig(configKey, value as FluidConfig[typeof configKey])
        valueDisplay.textContent = String(value)

        if (reinitFBO) {
          this.simulation.initFramebuffers()
        }
      })
    }
  }

  bindCheckbox(elementId: string, configKey: keyof FluidConfig): void {
    const checkbox = document.getElementById(elementId) as HTMLInputElement | null
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        updateConfig(configKey, (e.target as HTMLInputElement).checked as FluidConfig[typeof configKey])
      })
    }
  }

  updateCheckbox(elementId: string, value: boolean): void {
    const checkbox = document.getElementById(elementId) as HTMLInputElement | null
    if (checkbox) {
      checkbox.checked = value
    }
  }

  updateSelect(elementId: string, value: string): void {
    const select = document.getElementById(elementId) as HTMLSelectElement | null
    if (select) {
      select.value = value

      const dropdown = select.parentNode?.querySelector('.custom-dropdown') as HTMLElement | null
      if (dropdown) {
        const trigger = dropdown.querySelector('.custom-dropdown-trigger')
        const options = dropdown.querySelectorAll('.custom-dropdown-option')

        options.forEach((opt) => {
          const optEl = opt as HTMLElement
          if (optEl.dataset.value === value) {
            optEl.classList.add('selected')
            if (trigger) trigger.textContent = optEl.textContent
          } else {
            optEl.classList.remove('selected')
          }
        })
      }
    }
  }
}
