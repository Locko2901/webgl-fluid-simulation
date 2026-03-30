import {
  type HSV,
  type HSL,
  type RGBColor,
  hexToHsv,
  hsvToHex,
  hexToRgb,
  rgbToHex,
  hsvToHsl,
  hslToHsv,
} from '../utils/color'

export type { HSV, HSL, RGBColor }
export { hexToHsv, hsvToHex, hexToRgb, rgbToHex, hsvToHsl, hslToHsv }

type ColorFormat = 'hex' | 'rgb' | 'hsl'

export function createColorPicker(
  initialColor: string,
  onChange: (hex: string) => void,
  getActiveColorPicker: () => HTMLElement | null,
  setActiveColorPicker: (el: HTMLElement | null) => void
): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'color-picker-wrapper'

  let hsv = hexToHsv(initialColor)
  let currentHex = initialColor

  const trigger = document.createElement('div')
  trigger.className = 'color-picker-trigger'

  const swatch = document.createElement('div')
  swatch.className = 'color-picker-swatch'
  swatch.style.backgroundColor = currentHex
  trigger.appendChild(swatch)

  const panel = document.createElement('div')
  panel.className = 'color-picker-panel'

  const saturation = document.createElement('div')
  saturation.className = 'color-picker-saturation'

  const satBg = document.createElement('div')
  satBg.className = 'color-picker-saturation-bg'
  satBg.style.backgroundColor = hsvToHex({ h: hsv.h, s: 1, v: 1 })

  const satWhite = document.createElement('div')
  satWhite.className = 'color-picker-saturation-white'

  const satBlack = document.createElement('div')
  satBlack.className = 'color-picker-saturation-black'

  const satHandle = document.createElement('div')
  satHandle.className = 'color-picker-saturation-handle'
  satHandle.style.left = `${hsv.s * 100}%`
  satHandle.style.top = `${(1 - hsv.v) * 100}%`
  satHandle.style.backgroundColor = currentHex

  saturation.appendChild(satBg)
  saturation.appendChild(satWhite)
  saturation.appendChild(satBlack)
  saturation.appendChild(satHandle)

  const hue = document.createElement('div')
  hue.className = 'color-picker-hue'

  const hueHandle = document.createElement('div')
  hueHandle.className = 'color-picker-hue-handle'
  hueHandle.style.left = `${(hsv.h / 360) * 100}%`
  hueHandle.style.backgroundColor = hsvToHex({ h: hsv.h, s: 1, v: 1 })
  hue.appendChild(hueHandle)

  const formatTabs = document.createElement('div')
  formatTabs.className = 'color-picker-format-tabs'

  let activeFormat: ColorFormat = 'hex'
  const formats: ColorFormat[] = ['hex', 'rgb', 'hsl']
  const tabButtons: Record<ColorFormat, HTMLButtonElement> = {} as Record<ColorFormat, HTMLButtonElement>

  formats.forEach((format) => {
    const tab = document.createElement('button')
    tab.type = 'button'
    tab.className = 'color-picker-format-tab'
    tab.textContent = format.toUpperCase()
    if (format === activeFormat) tab.classList.add('active')
    tab.addEventListener('click', (e) => {
      e.stopPropagation()
      activeFormat = format
      formats.forEach((f) => tabButtons[f].classList.toggle('active', f === format))
      updateFormatVisibility()
    })
    tabButtons[format] = tab
    formatTabs.appendChild(tab)
  })

  const hexRow = document.createElement('div')
  hexRow.className = 'color-picker-input-row color-picker-format-hex'

  const hexLabel = document.createElement('span')
  hexLabel.className = 'color-picker-input-label'
  hexLabel.textContent = 'HEX'

  const hexInput = document.createElement('input')
  hexInput.type = 'text'
  hexInput.className = 'color-picker-hex-input'
  hexInput.value = currentHex.toUpperCase()
  hexInput.maxLength = 7

  const preview = document.createElement('div')
  preview.className = 'color-picker-preview'
  preview.style.backgroundColor = currentHex

  hexRow.appendChild(hexLabel)
  hexRow.appendChild(hexInput)
  hexRow.appendChild(preview)

  const rgbRow = document.createElement('div')
  rgbRow.className = 'color-picker-input-row color-picker-format-rgb'
  rgbRow.style.display = 'none'

  const rgbInputs: { r: HTMLInputElement; g: HTMLInputElement; b: HTMLInputElement } = {} as {
    r: HTMLInputElement
    g: HTMLInputElement
    b: HTMLInputElement
  }
  const rgb = hexToRgb(currentHex)

  ;(['r', 'g', 'b'] as const).forEach((channel) => {
    const group = document.createElement('div')
    group.className = 'color-picker-input-group'

    const label = document.createElement('span')
    label.className = 'color-picker-input-label'
    label.textContent = channel.toUpperCase()

    const input = document.createElement('input')
    input.type = 'number'
    input.className = 'color-picker-number-input'
    input.min = '0'
    input.max = '255'
    input.value = String(rgb[channel])
    rgbInputs[channel] = input

    group.appendChild(label)
    group.appendChild(input)
    rgbRow.appendChild(group)
  })

  const hslRow = document.createElement('div')
  hslRow.className = 'color-picker-input-row color-picker-format-hsl'
  hslRow.style.display = 'none'

  const hslInputs: { h: HTMLInputElement; s: HTMLInputElement; l: HTMLInputElement } = {} as {
    h: HTMLInputElement
    s: HTMLInputElement
    l: HTMLInputElement
  }
  const hsl = hsvToHsl(hsv)

  const hslConfig = [
    { key: 'h' as const, label: 'H', min: 0, max: 360, value: Math.round(hsl.h) },
    { key: 's' as const, label: 'S', min: 0, max: 100, value: Math.round(hsl.s) },
    { key: 'l' as const, label: 'L', min: 0, max: 100, value: Math.round(hsl.l) },
  ]

  hslConfig.forEach(({ key, label, min, max, value }) => {
    const group = document.createElement('div')
    group.className = 'color-picker-input-group'

    const labelEl = document.createElement('span')
    labelEl.className = 'color-picker-input-label'
    labelEl.textContent = label

    const input = document.createElement('input')
    input.type = 'number'
    input.className = 'color-picker-number-input'
    input.min = String(min)
    input.max = String(max)
    input.value = String(value)
    hslInputs[key] = input

    group.appendChild(labelEl)
    group.appendChild(input)
    hslRow.appendChild(group)
  })

  const updateFormatVisibility = () => {
    hexRow.style.display = activeFormat === 'hex' ? 'flex' : 'none'
    rgbRow.style.display = activeFormat === 'rgb' ? 'flex' : 'none'
    hslRow.style.display = activeFormat === 'hsl' ? 'flex' : 'none'
  }

  panel.appendChild(saturation)
  panel.appendChild(hue)
  panel.appendChild(formatTabs)
  panel.appendChild(hexRow)
  panel.appendChild(rgbRow)
  panel.appendChild(hslRow)

  wrapper.appendChild(trigger)
  wrapper.appendChild(panel)

  const updateUI = (triggerCallback = true) => {
    currentHex = hsvToHex(hsv)
    const pureHue = hsvToHex({ h: hsv.h, s: 1, v: 1 })
    swatch.style.backgroundColor = currentHex
    satBg.style.backgroundColor = pureHue
    satHandle.style.left = `${hsv.s * 100}%`
    satHandle.style.top = `${(1 - hsv.v) * 100}%`
    satHandle.style.backgroundColor = currentHex
    hueHandle.style.left = `${(hsv.h / 360) * 100}%`
    hueHandle.style.backgroundColor = pureHue
    hexInput.value = currentHex.toUpperCase()
    preview.style.backgroundColor = currentHex

    const rgbValues = hexToRgb(currentHex)
    rgbInputs.r.value = String(rgbValues.r)
    rgbInputs.g.value = String(rgbValues.g)
    rgbInputs.b.value = String(rgbValues.b)

    const hslValues = hsvToHsl(hsv)
    hslInputs.h.value = String(Math.round(hslValues.h))
    hslInputs.s.value = String(Math.round(hslValues.s))
    hslInputs.l.value = String(Math.round(hslValues.l))

    if (triggerCallback) {
      onChange(currentHex)
    }
  }

  updateUI(false)

  let satDragging = false
  const handleSatMove = (e: MouseEvent | TouchEvent) => {
    const rect = saturation.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    hsv.s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    hsv.v = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height))
    updateUI()
  }

  saturation.addEventListener('mousedown', (e) => {
    e.preventDefault()
    e.stopPropagation()
    satDragging = true
    handleSatMove(e)
  })

  saturation.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      satDragging = true
      handleSatMove(e)
    },
    { passive: false }
  )

  let hueDragging = false
  const handleHueMove = (e: MouseEvent | TouchEvent) => {
    const rect = hue.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    hsv.h = Math.max(0, Math.min(360, ((clientX - rect.left) / rect.width) * 360))
    updateUI()
  }

  hue.addEventListener('mousedown', (e) => {
    e.preventDefault()
    e.stopPropagation()
    hueDragging = true
    handleHueMove(e)
  })

  hue.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      hueDragging = true
      handleHueMove(e)
    },
    { passive: false }
  )

  document.addEventListener('mousemove', (e) => {
    if (satDragging) handleSatMove(e)
    if (hueDragging) handleHueMove(e)
  })

  document.addEventListener(
    'touchmove',
    (e) => {
      if (satDragging) handleSatMove(e)
      if (hueDragging) handleHueMove(e)
    },
    { passive: false }
  )

  document.addEventListener('mouseup', () => {
    satDragging = false
    hueDragging = false
  })

  document.addEventListener('touchend', () => {
    satDragging = false
    hueDragging = false
  })

  hexInput.addEventListener('input', () => {
    let val = hexInput.value.trim()
    if (!val.startsWith('#')) val = '#' + val
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      hsv = hexToHsv(val)
      updateUI()
    }
  })

  hexInput.addEventListener('blur', () => {
    hexInput.value = currentHex.toUpperCase()
  })

  const handleRgbInput = () => {
    const r = Math.max(0, Math.min(255, parseInt(rgbInputs.r.value) || 0))
    const g = Math.max(0, Math.min(255, parseInt(rgbInputs.g.value) || 0))
    const b = Math.max(0, Math.min(255, parseInt(rgbInputs.b.value) || 0))
    const hex = rgbToHex(r, g, b)
    hsv = hexToHsv(hex)
    updateUI()
  }

  rgbInputs.r.addEventListener('input', handleRgbInput)
  rgbInputs.g.addEventListener('input', handleRgbInput)
  rgbInputs.b.addEventListener('input', handleRgbInput)

  const handleHslInput = () => {
    const h = Math.max(0, Math.min(360, parseInt(hslInputs.h.value) || 0))
    const s = Math.max(0, Math.min(100, parseInt(hslInputs.s.value) || 0))
    const l = Math.max(0, Math.min(100, parseInt(hslInputs.l.value) || 0))
    hsv = hslToHsv({ h, s, l })
    updateUI()
  }

  hslInputs.h.addEventListener('input', handleHslInput)
  hslInputs.s.addEventListener('input', handleHslInput)
  hslInputs.l.addEventListener('input', handleHslInput)

  trigger.addEventListener('click', (e) => {
    e.stopPropagation()

    const active = getActiveColorPicker()
    if (active && active !== wrapper) {
      active.classList.remove('open')
    }

    wrapper.classList.toggle('open')
    setActiveColorPicker(wrapper.classList.contains('open') ? wrapper : null)
  })

  panel.addEventListener('click', (e) => e.stopPropagation())

  return wrapper
}
