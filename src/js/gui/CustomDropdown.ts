export interface DropdownOption {
  value: string
  label: string
}

export function createCustomDropdown(
  options: DropdownOption[],
  initialValue: string,
  onChange: (value: string) => void,
  getActiveDropdown: () => HTMLElement | null,
  setActiveDropdown: (el: HTMLElement | null) => void
): HTMLElement {
  const dropdown = document.createElement('div')
  dropdown.className = 'custom-dropdown'

  const initialOption = options.find((opt) => opt.value === initialValue)
  const initialLabel = initialOption?.label || options[0]?.label || ''

  const trigger = document.createElement('button')
  trigger.type = 'button'
  trigger.className = 'custom-dropdown-trigger'
  trigger.textContent = initialLabel

  const menu = document.createElement('div')
  menu.className = 'custom-dropdown-menu'

  options.forEach((opt) => {
    const optionEl = document.createElement('div')
    optionEl.className = 'custom-dropdown-option'
    if (opt.value === initialValue) {
      optionEl.classList.add('selected')
    }
    optionEl.textContent = opt.label
    optionEl.dataset.value = opt.value

    optionEl.addEventListener('click', (e) => {
      e.stopPropagation()

      menu.querySelectorAll('.custom-dropdown-option').forEach((el) => {
        el.classList.remove('selected')
      })
      optionEl.classList.add('selected')

      trigger.textContent = opt.label

      dropdown.classList.remove('open')
      setActiveDropdown(null)

      onChange(opt.value)
    })

    menu.appendChild(optionEl)
  })

  trigger.addEventListener('click', (e) => {
    e.stopPropagation()

    const active = getActiveDropdown()
    if (active && active !== dropdown) {
      active.classList.remove('open')
    }

    dropdown.classList.toggle('open')
    setActiveDropdown(dropdown.classList.contains('open') ? dropdown : null)
  })

  dropdown.appendChild(trigger)
  dropdown.appendChild(menu)

  return dropdown
}
